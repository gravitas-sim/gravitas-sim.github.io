// UI and event handling functions

import {
  screen_to_world,
  bh_list,
  planets,
  stars,
  gas_giants,
  asteroids,
  debris,
  particles,
  gravity_ripples,
  neutron_stars,
  white_dwarfs,
  accretion_disk_particles,
  resetPhysicsObjectCounter,
  setPhysicsObjectCounter,
  SOLAR_MASS_UNIT,
  Planet,
  GasGiant,
  Asteroid,
  Comet,
  StarObject,
  BlackHole,
  Debris,
  NeutronStar,
  WhiteDwarf,
  updatePhysicsSettings,
  setStateReference,
  particlePool,
  findObjectAtPosition,
} from './physics.js';

import { worldToScreen } from './utils.js';

const canvas = document.getElementById('simulationCanvas');
const starfieldCanvas = document.getElementById('starfieldCanvas');

// Global state object
const state = {
  zoom: 1.0,
  pan: { x: 0.0, y: 0.0 },
  paused: false,
  mouse: { x: -1000, y: -1000, down: false }, // Initialize mouse off-screen to prevent accidental object detection
  adding_mass: false,
  add_start_screen: { x: 0, y: 0 },
  add_start_world: { x: 0, y: 0 },
  inspector_open: false,
  touch_active: false,
  touch_id: null,
  last_time: 0,
  frame_count: 0,
  user_has_interacted: false, // Track if user has actually interacted with the page
};

// Global variables
const SAVE_KEY = 'gravitas_simulation_save';

const DEFAULT_SETTINGS = {
  preset_scenario: 'Binary BH',
  gravitational_constant: 2.0,
  follow_mode: 'None',
  num_planets: 15,
  num_gas_giants: 2,
  num_neutron_stars: 0,
  num_white_dwarfs: 0,
  init_velocity: 20,
  velocity_stddev: 5,
  bh_mass: 10,
  num_black_holes: 1,
  bh_behavior: 'Static',
  use_individual_bh_masses: false,
  bh_masses: [],
  orbit_decay_rate: 0.005,
  placement: 'Random',
  mutual_gravity: false,
  show_trails: true,
  sim_speed: 1.0,
  show_velocity_vectors: false,
  interactive_add: true,
  trail_length: 15,
  trail_style: 'Glow',
  sim_size: 'Large',
  star_density: 10000,
  input_object_type: 'Star',
  show_bh_glow: true,
  show_accretion_disk: true,
  realistic_disk_physics: true,
  show_bh_jets: false,
  improved_lensing: true,
  lensing_strength: 100,
  show_dynamic_overlays: true,
  enable_asteroids: true,
  num_asteroids: 10,
  dynamic_object_properties: true,
  record_simulation: false,
  show_ambient_lighting: true,
  planet_base_color: '#6495ed',
  star_base_color: '#ffff00',
  enable_star_merging: true,
  max_star_mass_before_bh: 20.0,
};

let SETTINGS = { ...DEFAULT_SETTINGS };
let localSettings = {};

let current_scenario_name = null;

// Space Object Name Database
const SPACE_OBJECT_NAMES = {
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

// Function to get random name from a category
const getRandomName = (category) => {
  const names = SPACE_OBJECT_NAMES[category];
  return names[Math.floor(Math.random() * names.length)];
};

// Expanded scenario information
const SCENARIO_INFO = {
  'Binary BH': {
    title: 'Binary Black Hole',
    summary:
      'Two stellar-mass black holes (15 & 10 M☉) locked in mutual orbit. Watch as they spiral together, creating gravitational waves and eventually merging into a single, more massive black hole. Perfect for studying orbital dynamics and merger events.',
  },
  'Triple BH System': {
    title: 'Triple Black Hole',
    summary:
      'A chaotic three-body dance of massive black holes (20, 15, & 10 M☉) in a complex orbital arrangement. This unstable configuration will eventually eject one black hole while the remaining two merge. Demonstrates the chaotic nature of multi-body gravitational systems.',
  },
  'Supermassive BH': {
    title: 'Supermassive Core',
    summary:
      'One enormous black hole (80 M☉) dominates a dense stellar swarm with 50 planets, 5 gas giants, and 100 asteroids. The intense gravitational field creates spectacular accretion disks and tidal disruption events. Similar to the environment around real supermassive black holes in galactic centers.',
  },
  'Star Cluster': {
    title: 'Dense Star Cluster',
    summary:
      'A gravitationally bound collection of main-sequence stars, evolved giants, and stellar remnants with mutual gravitational interactions. Watch stellar encounters, binary formation, and the dynamic evolution of this stellar community over time.',
  },
  'Kuiper Belt': {
    title: 'Kuiper Belt',
    summary:
      "A sun-like star with outer-system objects including 8 planets, 4 gas giants, and 300 asteroids in distant orbits. The system mimics our Solar System's Kuiper Belt region, with icy bodies and dwarf planets orbiting far from the central star.",
  },
  'Sagittarius A*': {
    title: 'Sagittarius A*',
    summary:
      "The Milky Way's central supermassive black hole (4 million M☉) with fast-moving S-stars, compact objects, and debris in extreme orbits. Witness the incredible gravitational forces and relativistic effects near our galaxy's supermassive black hole.",
  },
  'Binary Star System': {
    title: 'Binary Stars',
    summary:
      'A pair of suns in mutual orbit with 5 planets orbiting the binary system. The complex gravitational environment creates interesting orbital dynamics and potential habitable zones. Similar to real binary star systems like Alpha Centauri.',
  },
  Slingshot: {
    title: 'Gravity Slingshot',
    summary:
      'A massive black hole (60 M☉) paired with a smaller companion (3 M☉) create dramatic gravitational assists for nearby planets and gas giants. Watch objects gain tremendous velocity through close encounters, mimicking spacecraft gravity assists.',
  },
  'Rogue Encounter': {
    title: 'Rogue Encounter',
    summary:
      'A wandering black hole (30 M☉) passes through a stable planetary system with 12 planets, 4 gas giants, and asteroids. Watch the dramatic orbital disruption, planet ejection, and tidal capture events as the rogue intruder wreaks havoc.',
  },
  'Neutron Star Collision': {
    title: 'Neutron Star Merger',
    summary:
      'Two neutron stars (1.4 M☉ each) spiral toward each other in a death dance. This rare event produces gravitational waves, gamma-ray bursts, and creates heavy elements through r-process nucleosynthesis. Based on the LIGO-detected GW170817 event.',
  },
  'Pulsar System': {
    title: 'Pulsar with Planets',
    summary:
      "A rapidly spinning neutron star with 3 planets in tight orbits. The pulsar's intense magnetic field and radiation create a harsh environment. Based on the first confirmed exoplanets discovered around PSR B1257+12.",
  },
  'White Dwarf Binary': {
    title: 'White Dwarf Binary',
    summary:
      'Two white dwarf stars in a close binary system with accretion between them. One star gradually steals material from its companion, potentially leading to a Type Ia supernova. Includes debris disk and stellar remnants.',
  },
  'Stellar Graveyard': {
    title: 'Stellar Graveyard',
    summary:
      'A dynamic collection of stellar remnants: 3 black holes, 5 neutron stars, and 8 white dwarfs with surviving planets and extensive debris fields. Watch these stellar corpses interact in their final gravitational dance.',
  },
  'Galactic Center': {
    title: 'Galactic Center',
    summary:
      'A supermassive black hole (4000 M☉) surrounded by high-velocity stars, stellar remnants, and dense stellar populations. Experience the extreme gravitational environment with spectacular accretion, jets, and relativistic effects.',
  },
  'Supernova Remnant': {
    title: 'Supernova Remnant',
    summary:
      'The explosive aftermath of a massive star death: a neutron star surrounded by high-velocity debris, shocked planets, and disrupted gas giants. Experience the violent and energetic environment left behind by stellar death.',
  },
  'Compact Object Zoo': {
    title: 'Compact Object Zoo',
    summary:
      'A diverse collection of compact objects: multiple black holes, neutron stars, and white dwarfs of various masses interacting in a dense environment. Perfect for studying the different types of stellar endpoints and their interactions.',
  },
  'Millisecond Pulsar': {
    title: 'Millisecond Pulsar',
    summary:
      "An extremely fast-spinning neutron star (recycled pulsar) with a white dwarf companion and planetary debris. These 'recycled' pulsars are spun up by accretion and are among the most precise timekeepers in the universe.",
  },
  'Tidal Disruption Event': {
    title: 'Tidal Disruption',
    summary:
      'Multiple objects approach a supermassive black hole (2000 M☉) and are torn apart by extreme tidal forces. Watch as planets and gas giants are stretched, disrupted, and either ejected or accreted, creating spectacular debris streams.',
  },
  'Intermediate Mass BH': {
    title: 'Intermediate Mass BH',
    summary:
      'A rare intermediate-mass black hole (400 M☉) in a globular cluster environment with dense stellar populations. These elusive objects bridge the gap between stellar-mass and supermassive black holes.',
  },
  'Galactic Collision': {
    title: 'Galactic Collision',
    summary:
      'Two supermassive black holes (1.2M & 1.0M M☉) with hundreds of stars representing galactic cores in collision. Witness the formation of tidal streams, stellar disruption, and the eventual merger of supermassive black holes.',
  },
  'Micro BH Swarm': {
    title: 'Micro BH Swarm',
    summary:
      'A dynamic swarm of small black holes (0.6-1.8 M☉) with planets and gas giants in chaotic orbital dance. Watch as these stellar-mass black holes interact, merge, and create complex gravitational resonances.',
  },
  'Exoplanet Lab': {
    title: 'Exoplanet Lab',
    summary:
      'A diverse collection of 120+ exoplanets, gas giants, and even pulsar planets around various stellar hosts. Explore the incredible diversity of planetary systems with interactive orbital mechanics and planetary interactions.',
  },
};

// Object inspection functions - copied from working original file
const PLANET_RADIUS = 5; // From physics.js
const GAS_GIANT_RADIUS = 8; // From physics.js
const STAR_OBJ_RADIUS = 20; // From physics.js

const getBlackHoleInfo = (bh) => {
    const massInSuns = bh.mass / SOLAR_MASS_UNIT;
    const massInKg = massInSuns * 1.989e30;
    
    // Real Schwarzschild radius calculation (in meters)
    const G = 6.67430e-11; // Gravitational constant in m³/kg/s²
    const c = 299792458; // Speed of light in m/s
    const schwarzschildRadiusM = (2 * G * massInKg) / (c * c);
    const schwarzschildRadiusKm = schwarzschildRadiusM / 1000;
    const schwarzschildRadiusAU = schwarzschildRadiusM / 1.496e11; // 1 AU in meters
    
    // Real escape velocity at Schwarzschild radius (should be c)
    const escapeVelocityAtRs = Math.sqrt((2 * G * massInKg) / schwarzschildRadiusM);
    const escapeVelocityAtRsC = (escapeVelocityAtRs / c) * 100; // As percentage of light speed
    
    // Real density calculation (mass within Schwarzschild radius)
    const volume = (4/3) * Math.PI * Math.pow(schwarzschildRadiusM, 3);
    const density = massInKg / volume; // kg/m³
    
    // Hawking temperature (simplified)
    const hbar = 1.054571817e-34; // Reduced Planck constant
    const kB = 1.380649e-23; // Boltzmann constant
    const hawkingTemp = (hbar * c * c * c) / (8 * Math.PI * G * massInKg * kB);
    
    // Hawking radiation lifetime (simplified)
    const hawkingLifetime = (5120 * Math.PI * G * G * massInKg * massInKg * massInKg) / (hbar * c * c * c * c);
    const hawkingLifetimeYears = hawkingLifetime / (365.25 * 24 * 3600);
    
    // Real orbital period at 3 Schwarzschild radii (innermost stable orbit)
    const iscoRadius = 3 * schwarzschildRadiusM;
    const orbitalPeriod = 2 * Math.PI * Math.sqrt(Math.pow(iscoRadius, 3) / (G * massInKg));
    const orbitalPeriodHours = orbitalPeriod / 3600;
    
    let bhType = 'Primordial';
    if (massInSuns > 1e6) bhType = 'Supermassive';
    else if (massInSuns > 100) bhType = 'Intermediate';
    else if (massInSuns > 3) bhType = 'Stellar-Mass';
    else bhType = 'Primordial';
    
    return {
        icon: '⚫',
        title: bh.name || 'Black Hole',
        stats: [
            { label: 'Mass', value: `${massInSuns.toFixed(2)} M☉ (${massInKg.toExponential(2)} kg)` },
            { label: 'Schwarzschild Radius', value: `${schwarzschildRadiusKm.toFixed(2)} km (${schwarzschildRadiusAU.toExponential(3)} AU)` },
            { label: 'Escape Velocity at Rs', value: `${escapeVelocityAtRsC.toFixed(1)}% of light speed` },
            { label: 'Average Density', value: `${density.toExponential(2)} kg/m³` },
            { label: 'Hawking Temperature', value: `${hawkingTemp.toExponential(2)} K` },
            { label: 'Hawking Lifetime', value: hawkingLifetimeYears > 1e10 ? `${(hawkingLifetimeYears/1e9).toFixed(1)} billion years` : `${hawkingLifetimeYears.toExponential(2)} years` },
            { label: 'ISCO Period', value: `${orbitalPeriodHours.toFixed(1)} hours` },
            { label: 'Type', value: bhType },
            { label: 'Position', value: `(${bh.pos.x.toFixed(1)}, ${bh.pos.y.toFixed(1)})` },
            { label: 'Velocity', value: `${Math.hypot(bh.vel.x, bh.vel.y).toFixed(1)} units/s` }
        ],
        description: `A ${bhType.toLowerCase()} black hole with ${massInSuns > 1e6 ? 'enormous' : massInSuns > 100 ? 'substantial' : massInSuns > 3 ? 'moderate' : 'minimal'} mass. The event horizon has a radius of ${schwarzschildRadiusKm.toFixed(1)} km. ${hawkingTemp > 1 ? 'This black hole emits Hawking radiation.' : 'This black hole is too massive to emit significant Hawking radiation.'} ${massInSuns > 1e6 ? 'Supermassive black holes like this power active galactic nuclei and quasars.' : massInSuns > 100 ? 'Intermediate black holes are rare and may form from merging stellar-mass black holes.' : massInSuns > 3 ? 'Stellar-mass black holes form from the collapse of massive stars.' : 'Primordial black holes may have formed in the early universe.'}`
    };
};

const getStarInfo = (star) => {
    const massInSuns = star.massInSuns || (star.mass / SOLAR_MASS_UNIT);
    const radiusInSuns = star.radius / STAR_OBJ_RADIUS;
    const radiusInKm = radiusInSuns * 696340; // Solar radius in km
    const massInKg = massInSuns * 1.989e30; // Solar mass in kg
    
    // Real temperature estimate based on mass
    const temperature = 3000 + (massInSuns - 0.2) * 4000; // K
    
    // Real luminosity (W)
    const luminosity = Math.pow(massInSuns, 3.5) * 3.828e26; // Solar luminosity in W
    
    // Real surface gravity (m/s²)
    const G = 6.67430e-11;
    const surfaceGravity = (G * massInKg) / Math.pow(radiusInKm * 1000, 2);
    
    // Real escape velocity (m/s)
    const escapeVelocity = Math.sqrt((2 * G * massInKg) / (radiusInKm * 1000));
    
    // Real orbital period at 1 AU (if applicable)
    const distanceFromCenter = Math.hypot(star.pos.x, star.pos.y);
    const centralMass = 1000; // Assume central mass in simulation units
    const orbitalPeriod = 2 * Math.PI * Math.sqrt(Math.pow(distanceFromCenter * 1e9, 3) / (G * centralMass * 1.989e30));
    const orbitalPeriodDays = orbitalPeriod / (24 * 3600);
    
    // Calculate stellar age based on mass and main sequence lifetime
    // More massive stars have shorter lifetimes
    // Use a deterministic calculation based on mass for consistent age
    const mainSequenceLifetime = Math.pow(massInSuns, -2.5) * 10; // Billion years, rough approximation
    const age = mainSequenceLifetime * 0.3; // Assume star is 30% through its main sequence lifetime
    
    let spectralType = 'M';
    if (massInSuns > 2.1) spectralType = 'O';
    else if (massInSuns > 1.4) spectralType = 'B';
    else if (massInSuns > 1.04) spectralType = 'A';
    else if (massInSuns > 0.8) spectralType = 'F';
    else if (massInSuns > 0.45) spectralType = 'G';
    else if (massInSuns > 0.08) spectralType = 'K';
    
    return {
        icon: '⭐',
        title: star.name || 'Star',
        stats: [
            { label: 'Mass', value: `${massInSuns.toFixed(2)} M☉ (${massInKg.toExponential(2)} kg)` },
            { label: 'Radius', value: `${radiusInSuns.toFixed(2)} R☉ (${radiusInKm.toFixed(0)} km)` },
            { label: 'Temperature', value: `${temperature.toFixed(0)} K` },
            { label: 'Luminosity', value: `${(luminosity/1e26).toFixed(2)} × 10²⁶ W` },
            { label: 'Surface Gravity', value: `${surfaceGravity.toFixed(0)} m/s²` },
            { label: 'Escape Velocity', value: `${(escapeVelocity/1000).toFixed(1)} km/s` },
            { label: 'Spectral Type', value: spectralType },
            { label: 'Age', value: `${age.toFixed(1)} billion years` },
            { label: 'Orbital Period', value: orbitalPeriodDays > 365 ? `${(orbitalPeriodDays/365).toFixed(1)} years` : `${orbitalPeriodDays.toFixed(1)} days` },
            { label: 'Position', value: `(${star.pos.x.toFixed(1)}, ${star.pos.y.toFixed(1)})` },
            { label: 'Velocity', value: `${Math.hypot(star.vel.x, star.vel.y).toFixed(1)} units/s` }
        ],
        description: `A ${spectralType}-type star with ${massInSuns > 3 ? 'high' : massInSuns > 0.8 ? 'moderate' : 'low'} mass. ${massInSuns > 20 ? 'This massive star will likely end its life as a black hole.' : massInSuns > 8 ? 'This star will become a neutron star or black hole.' : 'This star will become a white dwarf.'}`
    };
};

const getPlanetInfo = (planet) => {
    const massInEarths = planet.massInEarths || (planet.mass / 1.0);
    const radiusInEarths = planet.radius / PLANET_RADIUS;
    const radiusInKm = radiusInEarths * 6371; // Earth radius in km
    const massInKg = massInEarths * 5.972e24; // Earth mass in kg
    
    // Real density calculation (kg/m³)
    const volume = (4/3) * Math.PI * Math.pow(radiusInKm * 1000, 3); // Convert km to m
    const density = massInKg / volume;
    
    // Real escape velocity (m/s)
    const G = 6.67430e-11; // Gravitational constant
    const escapeVelocity = Math.sqrt((2 * G * massInKg) / (radiusInKm * 1000));
    
    // Real orbital period (if orbiting a central mass)
    const distanceFromCenter = Math.hypot(planet.pos.x, planet.pos.y);
    const centralMass = 1000; // Assume central mass in simulation units
    const orbitalPeriod = 2 * Math.PI * Math.sqrt(Math.pow(distanceFromCenter * 1e9, 3) / (G * centralMass * 1.989e30));
    const orbitalPeriodDays = orbitalPeriod / (24 * 3600);
    
    // Real surface gravity (m/s²)
    const surfaceGravity = (G * massInKg) / Math.pow(radiusInKm * 1000, 2);
    
    let planetType = 'Terrestrial';
    if (massInEarths > 10) planetType = 'Ice Giant';
    else if (massInEarths > 5) planetType = 'Gas Giant';
    else if (massInEarths > 0.5) planetType = 'Super-Earth';
    else planetType = 'Dwarf Planet';
    
    // Use the planet's actual density type if available
    const densityType = planet.density || 'rocky';
    let densityDescription = '';
    switch (densityType) {
        case 'gaseous':
            densityDescription = 'Gaseous composition with hydrogen and helium atmosphere';
            break;
        case 'icy':
            densityDescription = 'Icy composition with frozen volatiles';
            break;
        case 'rocky':
        default:
            densityDescription = 'Rocky composition with solid surface';
            break;
    }
    
    return {
        icon: '🪐',
        title: planet.name || 'Planet',
        stats: [
            { label: 'Mass', value: `${massInEarths.toFixed(2)} M⊕ (${massInKg.toExponential(2)} kg)` },
            { label: 'Radius', value: `${radiusInEarths.toFixed(2)} R⊕ (${radiusInKm.toFixed(0)} km)` },
            { label: 'Density', value: `${density.toFixed(0)} kg/m³` },
            { label: 'Surface Gravity', value: `${surfaceGravity.toFixed(1)} m/s²` },
            { label: 'Escape Velocity', value: `${escapeVelocity.toFixed(0)} m/s` },
            { label: 'Orbital Period', value: orbitalPeriodDays > 365 ? `${(orbitalPeriodDays/365).toFixed(1)} years` : `${orbitalPeriodDays.toFixed(1)} days` },
            { label: 'Type', value: planetType },
            { label: 'Position', value: `(${planet.pos.x.toFixed(1)}, ${planet.pos.y.toFixed(1)})` },
            { label: 'Velocity', value: `${Math.hypot(planet.vel.x, planet.vel.y).toFixed(1)} units/s` }
        ],
        description: `A ${planetType.toLowerCase()} with ${massInEarths > 10 ? 'substantial' : massInEarths > 1 ? 'moderate' : 'low'} mass. ${densityDescription}. ${planetType === 'Terrestrial' ? 'This rocky world could potentially support life.' : planetType === 'Gas Giant' ? 'This gaseous planet has no solid surface.' : planetType === 'Ice Giant' ? 'This icy world is composed mainly of frozen volatiles.' : 'This small world may be a captured asteroid or dwarf planet.'}`
    };
};

const getGasGiantInfo = (gasGiant) => {
    const massInJupiters = gasGiant.massInJupiters || (gasGiant.mass / 50.0);
    const radiusInJupiters = gasGiant.radius / GAS_GIANT_RADIUS;
    const radiusInKm = radiusInJupiters * 69911; // Jupiter radius in km
    const massInKg = massInJupiters * 1.898e27; // Jupiter mass in kg
    
    // Real density calculation (kg/m³)
    const volume = (4/3) * Math.PI * Math.pow(radiusInKm * 1000, 3);
    const density = massInKg / volume;
    
    // Real escape velocity (m/s)
    const G = 6.67430e-11;
    const escapeVelocity = Math.sqrt((2 * G * massInKg) / (radiusInKm * 1000));
    
    // Real surface gravity (m/s²)
    const surfaceGravity = (G * massInKg) / Math.pow(radiusInKm * 1000, 2);
    
    // Real orbital period
    const distanceFromCenter = Math.hypot(gasGiant.pos.x, gasGiant.pos.y);
    const centralMass = 1000; // Assume central mass in simulation units
    const orbitalPeriod = 2 * Math.PI * Math.sqrt(Math.pow(distanceFromCenter * 1e9, 3) / (G * centralMass * 1.989e30));
    const orbitalPeriodDays = orbitalPeriod / (24 * 3600);
    
    // Use the actual giant type from the object, or determine from mass
    let giantType = gasGiant.giantType || 'Gas Giant';
    if (!gasGiant.giantType) {
        if (massInJupiters > 13) giantType = 'Brown Dwarf';
        else if (massInJupiters > 5) giantType = 'Super-Jupiter';
        else if (massInJupiters > 1) giantType = 'Jupiter-like';
        else if (massInJupiters > 0.5) giantType = 'Neptune-like';
        else giantType = 'Mini-Neptune';
    }
    
    // Convert giant type to display format
    const displayType = giantType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    return {
        icon: '🪐',
        title: gasGiant.name || 'Gas Giant',
        stats: [
            { label: 'Mass', value: `${massInJupiters.toFixed(2)} M♃ (${massInKg.toExponential(2)} kg)` },
            { label: 'Radius', value: `${radiusInJupiters.toFixed(2)} R♃ (${radiusInKm.toFixed(0)} km)` },
            { label: 'Density', value: `${density.toFixed(0)} kg/m³` },
            { label: 'Surface Gravity', value: `${surfaceGravity.toFixed(1)} m/s²` },
            { label: 'Escape Velocity', value: `${(escapeVelocity/1000).toFixed(1)} km/s` },
            { label: 'Orbital Period', value: orbitalPeriodDays > 365 ? `${(orbitalPeriodDays/365).toFixed(1)} years` : `${orbitalPeriodDays.toFixed(1)} days` },
            { label: 'Type', value: displayType },
            { label: 'Position', value: `(${gasGiant.pos.x.toFixed(1)}, ${gasGiant.pos.y.toFixed(1)})` },
            { label: 'Velocity', value: `${Math.hypot(gasGiant.vel.x, gasGiant.vel.y).toFixed(1)} units/s` }
        ],
        description: `A ${displayType.toLowerCase()} with ${massInJupiters > 10 ? 'enormous' : massInJupiters > 1 ? 'substantial' : 'moderate'} mass. ${giantType === 'brown_dwarf' ? 'This object is massive enough to fuse deuterium but not hydrogen, making it a failed star.' : giantType === 'super_jupiter' ? 'This massive gas giant has extreme atmospheric pressures and may have formed directly from a protoplanetary disk.' : giantType === 'jupiter_like' ? 'This Jupiter-like planet has a thick hydrogen-helium atmosphere with distinctive banding patterns.' : giantType === 'neptune_like' ? 'This Neptune-like ice giant has a composition rich in water, ammonia, and methane ices.' : 'This mini-Neptune has a substantial atmosphere but is smaller than typical gas giants.'}`
    };
};

const getAsteroidInfo = (asteroid) => {
    const massInEarths = asteroid.mass / 1.0;
    const massInKg = massInEarths * 5.972e24;
    const radiusInKm = asteroid.radius * 1000; // Rough conversion
    const radiusInM = radiusInKm * 1000;
    
    // Real density calculation (kg/m³)
    const volume = (4/3) * Math.PI * Math.pow(radiusInM, 3);
    const density = massInKg / volume;
    
    // Real escape velocity (m/s)
    const G = 6.67430e-11;
    const escapeVelocity = Math.sqrt((2 * G * massInKg) / radiusInM);
    
    // Real surface gravity (m/s²)
    const surfaceGravity = (G * massInKg) / Math.pow(radiusInM, 2);
    
    // Real orbital period
    const distanceFromCenter = Math.hypot(asteroid.pos.x, asteroid.pos.y);
    const centralMass = 1000; // Assume central mass in simulation units
    const orbitalPeriod = 2 * Math.PI * Math.sqrt(Math.pow(distanceFromCenter * 1e9, 3) / (G * centralMass * 1.989e30));
    const orbitalPeriodDays = orbitalPeriod / (24 * 3600);
    
    let asteroidType = 'Asteroid';
    if (asteroid.radius > 5) asteroidType = 'Dwarf Planet';
    else if (asteroid.radius > 2) asteroidType = 'Large Asteroid';
    else asteroidType = 'Small Asteroid';
    
    return {
        icon: '☄️',
        title: asteroid.name || 'Asteroid',
        stats: [
            { label: 'Mass', value: `${massInEarths.toFixed(4)} M⊕ (${massInKg.toExponential(2)} kg)` },
            { label: 'Radius', value: `${radiusInKm.toFixed(0)} km` },
            { label: 'Density', value: `${density.toFixed(0)} kg/m³` },
            { label: 'Surface Gravity', value: `${surfaceGravity.toFixed(3)} m/s²` },
            { label: 'Escape Velocity', value: `${escapeVelocity.toFixed(1)} m/s` },
            { label: 'Orbital Period', value: orbitalPeriodDays > 365 ? `${(orbitalPeriodDays/365).toFixed(1)} years` : `${orbitalPeriodDays.toFixed(1)} days` },
            { label: 'Type', value: asteroidType },
            { label: 'Position', value: `(${asteroid.pos.x.toFixed(1)}, ${asteroid.pos.y.toFixed(1)})` },
            { label: 'Velocity', value: `${Math.hypot(asteroid.vel.x, asteroid.vel.y).toFixed(1)} units/s` }
        ],
        description: `A ${asteroidType.toLowerCase()} with ${asteroid.radius > 5 ? 'significant' : asteroid.radius > 2 ? 'moderate' : 'minimal'} mass. ${asteroidType === 'Dwarf Planet' ? 'This object is large enough to be rounded by its own gravity.' : 'This rocky body orbits in the system, potentially as part of a belt or as a rogue object.'}`
    };
};

const getNeutronStarInfo = (neutronStar) => {
    const massInSuns = neutronStar.massInSuns || (neutronStar.mass / SOLAR_MASS_UNIT);
    const radiusInKm = neutronStar.radius * 1000; // Rough conversion to km
    const density = neutronStar.mass / (Math.PI * neutronStar.radius * neutronStar.radius);
    const escapeVelocity = Math.sqrt(2 * SETTINGS.gravitational_constant * neutronStar.mass / neutronStar.radius);
    const schwarzschildRadius = 2 * SETTINGS.gravitational_constant * neutronStar.mass / (3e8 * 3e8); // Simplified
    
    const starType = neutronStar.starType || 'Neutron Star';
    const isPulsar = neutronStar.pulsar || false;
    
    return {
        icon: isPulsar ? '⚡' : '⭐',
        title: neutronStar.name || starType,
        stats: [
            { label: 'Mass', value: `${massInSuns.toFixed(2)} M☉` },
            { label: 'Radius', value: `${radiusInKm.toFixed(0)} km` },
            { label: 'Density', value: `${density.toFixed(2)} mass/unit²` },
            { label: 'Escape Velocity', value: `${escapeVelocity.toFixed(1)} units/s` },
            { label: 'Schwarzschild Radius', value: `${schwarzschildRadius.toFixed(6)} units` },
            { label: 'Type', value: starType },
            { label: 'Pulsar', value: isPulsar ? 'Yes' : 'No' },
            { label: 'Position', value: `(${neutronStar.pos.x.toFixed(1)}, ${neutronStar.pos.y.toFixed(1)})` },
            { label: 'Velocity', value: `${Math.hypot(neutronStar.vel.x, neutronStar.vel.y).toFixed(1)} units/s` }
        ],
        description: `A ${starType.toLowerCase()} with ${massInSuns > 2.0 ? 'extreme' : 'high'} density. ${isPulsar ? 'This pulsar emits regular beams of radiation as it rotates.' : 'This neutron star is the collapsed core of a massive star.'} ${starType === 'Magnetar' ? 'This magnetar has an extremely strong magnetic field, making it one of the most powerful objects in the universe.' : starType === 'Pulsar' ? 'This pulsar rotates rapidly, emitting beams of radiation that sweep across space.' : 'This neutron star is composed almost entirely of neutrons, making it incredibly dense.'}`
    };
};

const getWhiteDwarfInfo = (whiteDwarf) => {
    const massInSuns = whiteDwarf.massInSuns || (whiteDwarf.mass / SOLAR_MASS_UNIT);
    const radiusInEarths = whiteDwarf.radius / PLANET_RADIUS; // Compare to Earth radius
    const density = whiteDwarf.mass / (Math.PI * whiteDwarf.radius * whiteDwarf.radius);
    const escapeVelocity = Math.sqrt(2 * SETTINGS.gravitational_constant * whiteDwarf.mass / whiteDwarf.radius);
    const chandrasekharLimit = 1.4; // Solar masses
    
    const dwarfType = whiteDwarf.dwarfType || 'Carbon-Oxygen';
    
    return {
        icon: '⭐',
        title: whiteDwarf.name || 'White Dwarf',
        stats: [
            { label: 'Mass', value: `${massInSuns.toFixed(2)} M☉` },
            { label: 'Radius', value: `${radiusInEarths.toFixed(2)} R⊕` },
            { label: 'Density', value: `${density.toFixed(2)} mass/unit²` },
            { label: 'Escape Velocity', value: `${escapeVelocity.toFixed(1)} units/s` },
            { label: 'Chandrasekhar Limit', value: `${chandrasekharLimit} M☉` },
            { label: 'Type', value: dwarfType },
            { label: 'Position', value: `(${whiteDwarf.pos.x.toFixed(1)}, ${whiteDwarf.pos.y.toFixed(1)})` },
            { label: 'Velocity', value: `${Math.hypot(whiteDwarf.vel.x, whiteDwarf.vel.y).toFixed(1)} units/s` }
        ],
        description: `A ${dwarfType.toLowerCase()} white dwarf with ${massInSuns > 1.2 ? 'high' : massInSuns > 0.6 ? 'moderate' : 'low'} mass. ${dwarfType === 'Oxygen-Neon' ? 'This massive white dwarf is near the Chandrasekhar limit and may become a neutron star.' : dwarfType === 'Carbon-Oxygen' ? 'This is the most common type of white dwarf, composed of carbon and oxygen.' : 'This low-mass white dwarf is composed primarily of helium.'} ${massInSuns > chandrasekharLimit ? 'This white dwarf exceeds the Chandrasekhar limit and may collapse into a neutron star.' : 'This white dwarf is stable and will slowly cool over billions of years.'}`
    };
};

const getCometInfo = (comet) => {
    const massInComets = comet.massInComets || (comet.mass / 0.1);
    const radiusInKm = comet.radius * 1000; // Rough conversion to km
    const density = comet.mass / (Math.PI * comet.radius * comet.radius);
    const escapeVelocity = Math.sqrt(2 * SETTINGS.gravitational_constant * comet.mass / comet.radius);
    const tailLength = comet.tailLength || 35;
    
    const cometType = comet.cometType || 'short_period';
    const displayType = cometType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    return {
        icon: '☄️',
        title: comet.name || 'Comet',
        stats: [
            { label: 'Mass', value: `${massInComets.toFixed(3)} C` },
            { label: 'Radius', value: `${radiusInKm.toFixed(0)} km` },
            { label: 'Density', value: `${density.toFixed(2)} mass/unit²` },
            { label: 'Escape Velocity', value: `${escapeVelocity.toFixed(1)} units/s` },
            { label: 'Tail Length', value: `${tailLength.toFixed(0)} units` },
            { label: 'Type', value: displayType },
            { label: 'Position', value: `(${comet.pos.x.toFixed(1)}, ${comet.pos.y.toFixed(1)})` },
            { label: 'Velocity', value: `${Math.hypot(comet.vel.x, comet.vel.y).toFixed(1)} units/s` }
        ],
        description: `A ${displayType.toLowerCase()} comet with ${massInComets > 0.1 ? 'substantial' : massInComets > 0.01 ? 'moderate' : 'small'} mass. ${cometType === 'periodic' ? 'This periodic comet returns to the inner solar system regularly, like Halley\'s Comet.' : cometType === 'long_period' ? 'This long-period comet has an orbital period of more than 200 years.' : 'This short-period comet completes its orbit in less than 200 years.'} The comet\'s tail is ${tailLength > 50 ? 'very long' : tailLength > 30 ? 'moderate' : 'short'} and points away from the sun due to solar radiation pressure.`
    };
};

/**
 * Show the object inspector modal with detailed information about a physics object
 * @param {Object} object - Physics object to inspect
 * @param {string} type - Type of object (BlackHole, Star, Planet, etc.)
 */
const showObjectInspector = (object, type) => {
    // Check if inspector element exists
    const objectInspector = document.getElementById('objectInspector');
    if (!objectInspector) {
        console.error('objectInspector element not found!');
        return;
    }
    
    // Store the current object for auto-updating
    state.selectedObject = { object, type };
    
    const updateInspector = () => {
        if (!state.inspector_open || !state.selectedObject) return;
        
        let info;
        switch (state.selectedObject.type) {
            case 'BlackHole':
                info = getBlackHoleInfo(state.selectedObject.object);
                break;
            case 'Star':
                info = getStarInfo(state.selectedObject.object);
                break;
            case 'NeutronStar':
                info = getNeutronStarInfo(state.selectedObject.object);
                break;
            case 'WhiteDwarf':
                info = getWhiteDwarfInfo(state.selectedObject.object);
                break;
            case 'Planet':
                info = getPlanetInfo(state.selectedObject.object);
                break;
            case 'GasGiant':
                info = getGasGiantInfo(state.selectedObject.object);
                break;
            case 'Comet':
                info = getCometInfo(state.selectedObject.object);
                break;
            case 'Asteroid':
                info = getAsteroidInfo(state.selectedObject.object);
                break;
            default:
                console.error('Unknown object type:', state.selectedObject.type);
                return;
        }
        
        const inspectorTitle = document.getElementById('inspectorTitle');
        const inspectorContent = document.getElementById('inspectorContent');
        
        if (!inspectorTitle || !inspectorContent) {
            console.error('Inspector title or content elements not found!');
            return;
        }
        
        inspectorTitle.innerHTML = `<span class="object-icon">${info.icon}</span>${info.title}`;
        
        let content = '';
        info.stats.forEach(stat => {
            content += `
                <div class="stat-row">
                    <span class="stat-label">${stat.label}:</span>
                    <span class="stat-value">${stat.value}</span>
                </div>
            `;
        });
        
        content += `<div class="object-description">${info.description}</div>`;
        inspectorContent.innerHTML = content;
    };
    
    // Initial update
    updateInspector();
    
    // Set up auto-update interval
    if (state.inspectorUpdateInterval) {
        clearInterval(state.inspectorUpdateInterval);
    }
    state.inspectorUpdateInterval = setInterval(updateInspector, 100); // Update 10 times per second
    
    // Show the inspector
    objectInspector.classList.add('visible');
    state.inspector_open = true;
};

const hideObjectInspector = () => {
    console.log('hideObjectInspector called');
    const objectInspector = document.getElementById('objectInspector');
    if (!objectInspector) {
        console.error('objectInspector element not found when trying to hide!');
        return;
    }
    
    console.log('Removing visible class and closing inspector');
    objectInspector.classList.remove('visible');
    state.inspector_open = false;
    
    // Clear auto-update interval
    if (state.inspectorUpdateInterval) {
        clearInterval(state.inspectorUpdateInterval);
        state.inspectorUpdateInterval = null;
    }
    state.selectedObject = null;
    console.log('Inspector should now be hidden');
};

/**
 * Show scenario information banner with title and description
 * Displays information about the current simulation scenario for 6 seconds
 */
const show_scenario_info = () => {
  // Prevent automatic display on page load - only show if user has interacted
  // Also add a frame count check to prevent early display
  if (!state.user_has_interacted || state.frame_count < 300) {
    return;
  }
  
  const scenarioInfoDiv = document.getElementById('scenarioInfoDisplay');
  if (current_scenario_name && SCENARIO_INFO[current_scenario_name]) {
    const info = SCENARIO_INFO[current_scenario_name];
    scenarioInfoDiv.innerHTML = `<h4>${info.title}</h4><p>${info.summary}</p>`;
    scenarioInfoDiv.classList.add('visible');
    setTimeout(() => scenarioInfoDiv.classList.remove('visible'), 6000);
  } else {
    scenarioInfoDiv.classList.remove('visible');
  }
};

/**
 * Apply preset scenario settings to the simulation
 * @param {Object} settings_dict - Settings object to modify with preset values
 */
const apply_preset = settings_dict => {
  const ps = settings_dict.preset_scenario;
  if (ps === 'None') return;
  const fresh_defaults = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  Object.assign(settings_dict, fresh_defaults, { preset_scenario: ps });

  if (ps === 'Binary BH') {
    Object.assign(settings_dict, {
      num_black_holes: 2,
      bh_behavior: 'Orbiting',
      use_individual_bh_masses: true,
      bh_masses: [15, 10],
      num_planets: 10,
      num_gas_giants: 2,
      init_velocity: 15,
      velocity_stddev: 5,
      placement: 'Circular',
      mutual_gravity: false,
      orbit_decay_rate: 0.002, // Gravitational wave inspiral rate
      show_trails: true,
      sim_speed: 1.0,
      show_velocity_vectors: false,
      interactive_add: true,
      trail_length: 15,
      trail_style: 'Glow',
      sim_size: 'Large',
      star_density: 10000,
      input_object_type: 'Star',
      show_bh_glow: true,
      show_accretion_disk: true,
      show_bh_jets: false,
      improved_lensing: true,
      lensing_strength: 100,
      show_dynamic_overlays: true,
      enable_asteroids: true,
      num_asteroids: 30,
      dynamic_object_properties: true,
      record_simulation: false,
      show_ambient_lighting: true,
      planet_base_color: '#6495ed',
      star_base_color: '#ffff00',
      enable_star_merging: true,
      max_star_mass_before_bh: 20.0,
    });
  } else if (ps === 'Neutron Star Collision') {
    Object.assign(settings_dict, {
      num_black_holes: 0,
      num_neutron_stars: 2,
      bh_behavior: 'Orbiting',
      num_planets: 5,
      num_gas_giants: 1,
      num_asteroids: 20,
      placement: 'Circular',
      init_velocity: 30,
      mutual_gravity: true,
      show_trails: true,
      trail_length: 50,
      gravitational_constant: 1.5,
      sim_speed: 0.8,
      enable_star_merging: true,
    });
  } else if (ps === 'Pulsar System') {
    Object.assign(settings_dict, {
      num_black_holes: 0,
      num_neutron_stars: 1,
      num_planets: 3,
      num_gas_giants: 0,
      num_asteroids: 15,
      placement: 'Circular',
      init_velocity: 40,
      mutual_gravity: true,
      gravitational_constant: 1.3,
      sim_speed: 0.7,
      show_trails: true,
      trail_length: 30,
    });
  } else if (ps === 'White Dwarf Binary') {
    Object.assign(settings_dict, {
      num_black_holes: 0,
      num_white_dwarfs: 2,
      num_planets: 0,
      num_gas_giants: 0,
      num_asteroids: 30,
      placement: 'Circular',
      init_velocity: 25,
      mutual_gravity: true,
      gravitational_constant: 1.4,
      sim_speed: 0.8,
      enable_star_merging: true,
      show_trails: true,
      trail_length: 40,
    });
  } else if (ps === 'Stellar Graveyard') {
    Object.assign(settings_dict, {
      num_black_holes: 3,
      num_neutron_stars: 5,
      num_white_dwarfs: 8,
      num_planets: 10, // Some planets survived their stars' death
      num_gas_giants: 3,
      num_asteroids: 200, // Lots of debris
      placement: 'Random',
      init_velocity: 25,
      velocity_stddev: 12,
      mutual_gravity: true,
      gravitational_constant: 1.6,
      show_accretion_disk: true,
      show_bh_glow: true,
      sim_speed: 0.8,
      enable_star_merging: true,
    });
  } else if (ps === 'Galactic Center') {
    Object.assign(settings_dict, {
      num_black_holes: 1,
      bh_mass: 4000,
      bh_behavior: 'Static',
      num_neutron_stars: 8,
      num_white_dwarfs: 15,
      num_planets: 30,
      num_gas_giants: 8,
      num_asteroids: 100,
      placement: 'Multi-Ring',
      init_velocity: 70,
      velocity_stddev: 25,
      mutual_gravity: true,
      show_accretion_disk: true,
      show_bh_glow: true,
      show_bh_jets: true,
      improved_lensing: true,
      lensing_strength: 200,
      gravitational_constant: 1.8,
      sim_speed: 0.6,
      enable_star_merging: true,
    });
  } else if (ps === 'Supernova Remnant') {
    Object.assign(settings_dict, {
      num_black_holes: 0,
      num_neutron_stars: 1,
      num_white_dwarfs: 0,
      num_planets: 5, // Planets that survived the supernova
      num_gas_giants: 2,
      num_asteroids: 200, // Lots of debris from the explosion
      placement: 'Random',
      init_velocity: 50, // High-velocity debris
      velocity_stddev: 25,
      mutual_gravity: true,
      gravitational_constant: 1.8,
      sim_speed: 0.8,
      show_trails: true,
      trail_length: 60,
    });
  } else if (ps === 'Compact Object Zoo') {
    Object.assign(settings_dict, {
      num_black_holes: 3,
      num_neutron_stars: 4,
      num_white_dwarfs: 6,
      num_planets: 10,
      num_gas_giants: 3,
      num_asteroids: 40,
      placement: 'Random',
      init_velocity: 20,
      mutual_gravity: true,
      gravitational_constant: 1.5,
      sim_speed: 0.7,
      enable_star_merging: true,
      show_accretion_disk: true,
      show_bh_glow: true,
    });
  } else if (ps === 'Millisecond Pulsar') {
    Object.assign(settings_dict, {
      num_black_holes: 0,
      num_neutron_stars: 1,
      num_white_dwarfs: 1,
      num_planets: 2,
      num_gas_giants: 0,
      num_asteroids: 25,
      placement: 'Circular',
      init_velocity: 45,
      mutual_gravity: true,
      gravitational_constant: 1.4,
      sim_speed: 0.8,
      enable_star_merging: true,
      show_trails: true,
      trail_length: 35,
    });
  } else if (ps === 'Tidal Disruption Event') {
    Object.assign(settings_dict, {
      num_black_holes: 1,
      bh_mass: 2000,
      num_neutron_stars: 0,
      num_white_dwarfs: 0,
      num_planets: 3, // Multiple objects for dramatic effect
      num_gas_giants: 1,
      num_asteroids: 50, // Debris from tidal disruption
      placement: 'Empty',
      init_velocity: 80,
      velocity_stddev: 15,
      show_accretion_disk: true,
      show_bh_glow: true,
      show_bh_jets: true,
      improved_lensing: true,
      lensing_strength: 300,
      sim_speed: 0.7,
      gravitational_constant: 2.0,
    });
  } else if (ps === 'Intermediate Mass BH') {
    Object.assign(settings_dict, {
      num_black_holes: 1,
      bh_mass: 400,
      num_neutron_stars: 2,
      num_white_dwarfs: 8,
      num_planets: 30,
      num_gas_giants: 5,
      num_asteroids: 60,
      placement: 'Multi-Ring',
      init_velocity: 40,
      show_accretion_disk: true,
      show_bh_glow: true,
      gravitational_constant: 1.7,
      sim_speed: 0.6,
      mutual_gravity: true,
    });
  } else if (ps === 'Galactic Collision') {
    Object.assign(settings_dict, {
      num_black_holes: 2,
      bh_mass: 900,
      bh_behavior: 'Orbiting',
      use_individual_bh_masses: true,
      bh_masses: [1200, 1000], // Milky Way vs Andromeda-like masses
      num_planets: 300, // Represent billions of stars
      num_gas_giants: 30,
      num_asteroids: 600, // Lots of small objects
      num_neutron_stars: 15,
      num_white_dwarfs: 25,
      placement: 'Multi-Ring',
      init_velocity: 40,
      velocity_stddev: 20,
      mutual_gravity: true,
      show_accretion_disk: true,
      show_bh_glow: true,
      show_bh_jets: true,
      orbit_decay_rate: 0.005,
      sim_speed: 0.4, // Slower to see the collision develop
      improved_lensing: true,
      lensing_strength: 400,
      gravitational_constant: 1.9,
      enable_star_merging: true,
    });
  } else if (ps === 'Micro BH Swarm') {
    Object.assign(settings_dict, {
      num_black_holes: 12,
      bh_mass: 1.2,
      bh_behavior: 'Orbiting', // Make them dynamic!
      use_individual_bh_masses: true,
      bh_masses: [0.8, 1.1, 0.9, 1.4, 1.6, 1.2, 0.7, 1.3, 1.0, 1.5, 0.6, 1.8],
      num_planets: 50,
      num_gas_giants: 8,
      num_asteroids: 150,
      placement: 'Random',
      init_velocity: 20,
      velocity_stddev: 8,
      mutual_gravity: true,
      show_accretion_disk: true,
      show_bh_glow: true,
      gravitational_constant: 1.5,
      sim_speed: 0.7,
      enable_star_merging: true,
    });
  } else if (ps === 'Exoplanet Lab') {
    Object.assign(settings_dict, {
      num_black_holes: 0,
      num_planets: 120, // Diverse exoplanet collection
      num_gas_giants: 25, // Including hot Jupiters, mini-Neptunes
      num_asteroids: 300,
      num_neutron_stars: 1, // Pulsar planets are a thing!
      num_white_dwarfs: 2, // White dwarf planets discovered
      placement: 'Multi-Ring',
      init_velocity: 18,
      velocity_stddev: 8,
      mutual_gravity: true, // Planetary systems can interact
      show_accretion_disk: false,
      show_bh_glow: false,
      gravitational_constant: 1.3,
      sim_speed: 0.6,
      enable_star_merging: true,
    });
  } else if (ps === 'Triple BH System') {
    Object.assign(settings_dict, {
      num_black_holes: 3,
      bh_behavior: 'Orbiting',
      use_individual_bh_masses: true,
      bh_masses: [20, 15, 10],
      num_planets: 20,
      num_asteroids: 40,
      placement: 'Circular',
      init_velocity: 10,
      orbit_decay_rate: 0.001,
      mutual_gravity: true,
      show_accretion_disk: true,
      show_bh_glow: true,
      gravitational_constant: 1.6,
      sim_speed: 0.8,
      enable_star_merging: true,
    });
  } else if (ps === 'Supermassive BH') {
    Object.assign(settings_dict, {
      num_black_holes: 1,
      bh_mass: 80,
      num_planets: 50,
      num_gas_giants: 5,
      num_asteroids: 100,
      init_velocity: 25,
      show_accretion_disk: true,
      show_bh_glow: true,
      gravitational_constant: 1.7,
      sim_speed: 0.7,
      mutual_gravity: true,
      improved_lensing: true,
      lensing_strength: 150,
    });
  } else if (ps === 'Star Cluster') {
    Object.assign(settings_dict, {
      num_black_holes: 0,
      num_planets: 80, // These represent main-sequence stars
      num_gas_giants: 15, // These represent evolved stars
      num_asteroids: 150,
      num_neutron_stars: 2,
      num_white_dwarfs: 8,
      placement: 'Random',
      init_velocity: 12,
      velocity_stddev: 6,
      mutual_gravity: true, // Stars in clusters DO interact gravitationally
      gravitational_constant: 1.2,
      sim_speed: 0.8,
      enable_star_merging: true,
      show_trails: true,
      trail_length: 25,
    });
  } else if (ps === 'Kuiper Belt') {
    Object.assign(settings_dict, {
      placement: 'Empty',
      mutual_gravity: true,
      num_black_holes: 0,
      num_planets: 8,
      num_gas_giants: 4,
      enable_asteroids: true,
      num_asteroids: 300,
      init_velocity: 15,
      velocity_stddev: 5,
      gravitational_constant: 1.1,
      sim_speed: 0.9,
      show_trails: true,
      trail_length: 20,
    });
  } else if (ps === 'Sagittarius A*') {
    Object.assign(settings_dict, {
      num_black_holes: 1,
      bh_mass: 4000, // Reduced from 4 million to 4000 for better gameplay
      bh_behavior: 'Static',
      show_accretion_disk: true,
      show_bh_glow: true,
      show_bh_jets: true,
      num_planets: 100, // These represent S-stars near Sgr A*
      num_gas_giants: 5,
      num_asteroids: 200,
      num_neutron_stars: 10,
      num_white_dwarfs: 20,
      placement: 'Multi-Ring',
      init_velocity: 70, // Reduced from 300 for better visibility
      velocity_stddev: 25, // Reduced from 100
      mutual_gravity: true,
      improved_lensing: true,
      lensing_strength: 500,
      sim_speed: 0.5, // Slower to see the extreme dynamics
      gravitational_constant: 2.0,
      enable_star_merging: true,
    });
  } else if (ps === 'Binary Star System') {
    Object.assign(settings_dict, {
      num_black_holes: 0,
      mutual_gravity: true,
      placement: 'Empty',
      num_planets: 5,
      num_gas_giants: 2,
      num_asteroids: 20,
      init_velocity: 20,
      velocity_stddev: 8,
      gravitational_constant: 1.2,
      sim_speed: 0.8,
      enable_star_merging: true,
      show_trails: true,
      trail_length: 30,
    });
  } else if (ps === 'Slingshot') {
    Object.assign(settings_dict, {
      placement: 'Empty',
      num_black_holes: 2,
      use_individual_bh_masses: true,
      bh_masses: [60, 3], // Larger mass ratio for dramatic effect
      bh_behavior: 'Orbiting',
      num_planets: 25,
      num_gas_giants: 5,
      num_asteroids: 40,
      init_velocity: 30,
      velocity_stddev: 10,
      mutual_gravity: true,
      show_accretion_disk: true,
      show_bh_glow: true,
      sim_speed: 0.8,
      gravitational_constant: 1.6,
      enable_star_merging: true,
    });
  } else if (ps === 'Rogue Encounter') {
    Object.assign(settings_dict, {
      placement: 'Empty',
      num_black_holes: 1,
      bh_mass: 30,
      bh_behavior: 'Orbiting',
      mutual_gravity: true,
      num_planets: 12,
      num_gas_giants: 4,
      num_asteroids: 80,
      init_velocity: 40,
      velocity_stddev: 15,
      show_accretion_disk: true,
      show_bh_glow: true,
      sim_speed: 0.7,
      gravitational_constant: 1.5,
      enable_star_merging: true,
    });
  }

  settings_dict.preset_scenario = 'None';
};

const apply_placement = () => {
  const placement = SETTINGS.placement;
  const sim_size = SETTINGS.sim_size;

  // Get simulation bounds based on sim_size - reduced for better visibility
  let bounds;
  switch (sim_size) {
    case 'Small':
      bounds = 100;
      break; // was 200
    case 'Medium':
      bounds = 200;
      break; // was 400
    case 'Large':
      bounds = 300;
      break; // was 800
    case 'Huge':
      bounds = 500;
      break; // was 1200
    default:
      bounds = 300;
  }

  // Get all objects that need positioning (excluding central stars)
  const all_objects = [
    ...bh_list,
    ...planets,
    ...gas_giants,
    ...asteroids,
    ...neutron_stars,
    ...white_dwarfs,
  ];

  // Skip placement for Empty preset
  if (placement === 'Empty') return;

  switch (placement) {
    case 'Random':
      all_objects.forEach(obj => {
        // Random position within bounds
        const angle = Math.random() * 2 * Math.PI;
        const radius = Math.random() * bounds;
        obj.pos.x = Math.cos(angle) * radius;
        obj.pos.y = Math.sin(angle) * radius;

        // Random velocity
        const vel_angle = Math.random() * 2 * Math.PI;
        const vel_mag =
          (Math.random() - 0.5) * SETTINGS.init_velocity +
          (Math.random() - 0.5) * SETTINGS.velocity_stddev;
        obj.vel.x = Math.cos(vel_angle) * vel_mag;
        obj.vel.y = Math.sin(vel_angle) * vel_mag;
      });
      break;

    case 'Circular':
      all_objects.forEach((obj, i) => {
        const angle = (i / all_objects.length) * 2 * Math.PI;
        const radius = bounds * 0.7;
        obj.pos.x = Math.cos(angle) * radius;
        obj.pos.y = Math.sin(angle) * radius;

        // Orbital velocity
        const vel_mag = SETTINGS.init_velocity;
        obj.vel.x = -Math.sin(angle) * vel_mag;
        obj.vel.y = Math.cos(angle) * vel_mag;
      });
      break;

    case 'Multi-Ring':
      all_objects.forEach((obj, i) => {
        const ring = Math.floor(i / 20); // 20 objects per ring
        const angle = ((i % 20) / 20) * 2 * Math.PI;
        const radius = bounds * (0.3 + ring * 0.2);
        obj.pos.x = Math.cos(angle) * radius;
        obj.pos.y = Math.sin(angle) * radius;

        // Orbital velocity
        const vel_mag = SETTINGS.init_velocity * (1 - ring * 0.1);
        obj.vel.x = -Math.sin(angle) * vel_mag;
        obj.vel.y = Math.cos(angle) * vel_mag;
      });
      break;

    case 'Grid': {
      const grid_size = Math.ceil(Math.sqrt(all_objects.length));
      const spacing = (bounds * 2) / grid_size;
      all_objects.forEach((obj, i) => {
        const row = Math.floor(i / grid_size);
        const col = i % grid_size;
        obj.pos.x = (col - grid_size / 2) * spacing;
        obj.pos.y = (row - grid_size / 2) * spacing;

        // Small random velocity
        const vel_mag = SETTINGS.init_velocity * 0.3;
        obj.vel.x = (Math.random() - 0.5) * vel_mag;
        obj.vel.y = (Math.random() - 0.5) * vel_mag;
      });
      break;
    }
  }

  // Special positioning for various scenarios
  if (
    current_scenario_name === 'Neutron Star Collision' &&
    neutron_stars.length >= 2
  ) {
    neutron_stars[0].pos.x = -50;
    neutron_stars[0].pos.y = 0;
    neutron_stars[0].vel.x = 0;
    neutron_stars[0].vel.y = 15;

    neutron_stars[1].pos.x = 50;
    neutron_stars[1].pos.y = 0;
    neutron_stars[1].vel.x = 0;
    neutron_stars[1].vel.y = -15;
  }

  if (
    current_scenario_name === 'White Dwarf Binary' &&
    white_dwarfs.length >= 2
  ) {
    white_dwarfs[0].pos.x = -80;
    white_dwarfs[0].pos.y = 0;
    white_dwarfs[0].vel.x = 0;
    white_dwarfs[0].vel.y = 20;

    white_dwarfs[1].pos.x = 80;
    white_dwarfs[1].pos.y = 0;
    white_dwarfs[1].vel.x = 0;
    white_dwarfs[1].vel.y = -20;
  }

  if (
    current_scenario_name === 'Tidal Disruption Event' &&
    bh_list.length >= 1 &&
    planets.length >= 1
  ) {
    bh_list[0].pos.x = 0;
    bh_list[0].pos.y = 0;
    bh_list[0].vel.x = 0;
    bh_list[0].vel.y = 0;

    planets[0].pos.x = 150;
    planets[0].pos.y = 0;
    planets[0].vel.x = 0;
    planets[0].vel.y = 80;
  }

  // Special positioning for black holes in specific scenarios
  if (bh_list.length > 1) {
    switch (current_scenario_name) {
      case 'Binary BH':
        if (bh_list.length >= 2) {
          // Calculate proper orbital parameters for binary black holes
          const separation = 120; // Initial separation distance
          const m1 = bh_list[0].mass; // Mass of first black hole
          const m2 = bh_list[1].mass; // Mass of second black hole
          const totalMass = m1 + m2;
          
          // Calculate center of mass positions
          const r1 = separation * (m2 / totalMass); // Distance from BH1 to center of mass
          const r2 = separation * (m1 / totalMass); // Distance from BH2 to center of mass
          
          // Position black holes around center of mass
          bh_list[0].pos.x = -r1;
          bh_list[0].pos.y = 0;
          bh_list[1].pos.x = r2;
          bh_list[1].pos.y = 0;
          
          // Calculate orbital velocity for circular orbit
          // v = sqrt(G * M_total / separation) for reduced mass system
          const G = SETTINGS.gravitational_constant;
          const orbitalSpeed = Math.sqrt(G * totalMass / separation);
          
          // Apply velocities for circular orbit (perpendicular to separation)
          bh_list[0].vel.x = 0;
          bh_list[0].vel.y = orbitalSpeed * (m2 / totalMass); // Reduced velocity based on mass ratio
          bh_list[1].vel.x = 0;
          bh_list[1].vel.y = -orbitalSpeed * (m1 / totalMass); // Opposite direction
          
          // Add slight perturbation to start gravitational wave inspiral
          const perturbation = 0.95; // Slightly reduce velocity to start inspiral
          bh_list[0].vel.y *= perturbation;
          bh_list[1].vel.y *= perturbation;
        }
        break;

      case 'Triple BH System':
        if (bh_list.length >= 3) {
          // Triangle formation
          const radius = 150;
          for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * 2 * Math.PI;
            bh_list[i].pos.x = Math.cos(angle) * radius;
            bh_list[i].pos.y = Math.sin(angle) * radius;

            // Orbital velocity
            const vel_mag = 15;
            bh_list[i].vel.x = -Math.sin(angle) * vel_mag;
            bh_list[i].vel.y = Math.cos(angle) * vel_mag;
          }
        }
        break;

      case 'Slingshot':
        if (bh_list.length >= 2) {
          bh_list[0].pos.x = -200;
          bh_list[0].pos.y = 0;
          bh_list[0].vel.x = 0;
          bh_list[0].vel.y = 0;

          bh_list[1].pos.x = 200;
          bh_list[1].pos.y = 0;
          bh_list[1].vel.x = -30;
          bh_list[1].vel.y = 0;
        }
        break;
    }
  }
};

/**
 * Initialize the physics simulation with current settings
 * Creates all physics objects and applies initial conditions
 */
const initialize_simulation = () => {
  // Set the state reference in physics.js to ensure single source of truth
  setStateReference(state);
  
  const starting_preset = SETTINGS.preset_scenario;
  apply_preset(SETTINGS);
  current_scenario_name = starting_preset;

  // Ensure inspector is hidden during initialization
  hideObjectInspector();

  // Update physics settings
  updatePhysicsSettings(SETTINGS);

  state.zoom = 1.5; // Increased from 1.0 for better initial framing
  state.pan = { x: 0.0, y: 0.0 };
  // Clear all arrays instead of reassigning them
  bh_list.length = 0;
  planets.length = 0;
  stars.length = 0;
  gas_giants.length = 0;
  asteroids.length = 0;
  neutron_stars.length = 0;
  white_dwarfs.length = 0;
  debris.length = 0;
  particles.length = 0;
  gravity_ripples.length = 0;
  accretion_disk_particles.length = 0;
  particlePool.clear(); // Clear particle pool
  resetPhysicsObjectCounter();

  // Add central stars for specific presets
  if (['Kuiper Belt', 'Rogue Encounter'].includes(starting_preset)) {
    stars.push(new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1.0));
  }

  // Add black holes
  if (SETTINGS.use_individual_bh_masses && SETTINGS.bh_masses.length > 0) {
    for (let i = 0; i < SETTINGS.num_black_holes; i++) {
      const mass = SETTINGS.bh_masses[i] || SETTINGS.bh_mass;
      bh_list.push(new BlackHole({ x: 0, y: 0 }, mass * SOLAR_MASS_UNIT));
    }
  } else {
    for (let i = 0; i < SETTINGS.num_black_holes; i++) {
      bh_list.push(
        new BlackHole({ x: 0, y: 0 }, SETTINGS.bh_mass * SOLAR_MASS_UNIT)
      );
    }
  }

  // Add neutron stars
  for (let i = 0; i < (SETTINGS.num_neutron_stars || 0); i++) {
    neutron_stars.push(new NeutronStar({ x: 0, y: 0 }, { x: 0, y: 0 }));
  }

  // Add white dwarfs
  for (let i = 0; i < (SETTINGS.num_white_dwarfs || 0); i++) {
    white_dwarfs.push(new WhiteDwarf({ x: 0, y: 0 }, { x: 0, y: 0 }));
  }

  // Add planets
  for (let i = 0; i < SETTINGS.num_planets; i++) {
    planets.push(new Planet({ x: 0, y: 0 }, { x: 0, y: 0 }));
  }

  // Add gas giants
  for (let i = 0; i < SETTINGS.num_gas_giants; i++) {
    gas_giants.push(new GasGiant({ x: 0, y: 0 }, { x: 0, y: 0 }));
  }

  // Add asteroids
  if (SETTINGS.enable_asteroids) {
    for (let i = 0; i < SETTINGS.num_asteroids; i++) {
      asteroids.push(new Asteroid({ x: 0, y: 0 }, { x: 0, y: 0 }));
    }
  }

  // Apply placement patterns to position objects
  apply_placement();
};

// Settings functions
const setting_items = [
  {
    label: 'Preset Scenario',
    key: 'preset_scenario',
    type: 'option',
    options: [
      'None',
      'Binary BH',
      'Triple BH System',
      'Supermassive BH',
      'Star Cluster',
      'Kuiper Belt',
      'Sagittarius A*',
      'Binary Star System',
      'Slingshot',
      'Rogue Encounter',
      'Neutron Star Collision',
      'Pulsar System',
      'White Dwarf Binary',
      'Stellar Graveyard',
      'Galactic Center',
      'Supernova Remnant',
      'Compact Object Zoo',
      'Millisecond Pulsar',
      'Tidal Disruption Event',
      'Intermediate Mass BH',
      'Galactic Collision',
      'Micro BH Swarm',
      'Exoplanet Lab',
    ],
  },
  { label: '--- Simulation ---', type: 'separator' },
  {
    label: 'Gravitational Constant',
    key: 'gravitational_constant',
    type: 'float',
    min: 0.1,
    max: 20.0,
    step: 0.1,
  },
  { label: 'Mutual Gravity (All)', key: 'mutual_gravity', type: 'bool' },
  {
    label: 'Simulation Speed',
    key: 'sim_speed',
    type: 'float',
    min: 0.0,
    max: 5.0,
    step: 0.1,
  },
  {
    label: 'Simulation Size',
    key: 'sim_size',
    type: 'option',
    options: ['Small', 'Medium', 'Large', 'Huge'],
  },
  {
    label: 'Placement',
    key: 'placement',
    type: 'option',
    options: ['Circular', 'Multi-Ring', 'Random', 'Grid', 'Empty'],
  },
  { label: '--- Black Holes ---', type: 'separator' },
  {
    label: 'Number of Black Holes',
    key: 'num_black_holes',
    type: 'int',
    min: 0,
    max: 10,
    step: 1,
  },
  {
    label: 'Default BH Mass (Msun)',
    key: 'bh_mass',
    type: 'float',
    min: 0.1,
    max: 1000,
    step: 0.5,
  },
  {
    label: 'Use Individual BH Masses',
    key: 'use_individual_bh_masses',
    type: 'bool',
  },
  {
    label: 'BH Behavior',
    key: 'bh_behavior',
    type: 'option',
    options: ['Static', 'Orbiting'],
  },
  {
    label: 'Orbit Decay Rate',
    key: 'orbit_decay_rate',
    type: 'float',
    min: 0.0,
    max: 0.1,
    step: 0.001,
    precision: 3,
  },
  { label: '--- Compact Objects ---', type: 'separator' },
  {
    label: 'Number of Neutron Stars',
    key: 'num_neutron_stars',
    type: 'int',
    min: 0,
    max: 20,
    step: 1,
  },
  {
    label: 'Number of White Dwarfs',
    key: 'num_white_dwarfs',
    type: 'int',
    min: 0,
    max: 30,
    step: 1,
  },
  { label: '--- Objects ---', type: 'separator' },
  {
    label: 'Number of Planets',
    key: 'num_planets',
    type: 'int',
    min: 0,
    max: 200,
    step: 1,
  },
  {
    label: 'Number of Gas Giants',
    key: 'num_gas_giants',
    type: 'int',
    min: 0,
    max: 50,
    step: 1,
  },
  { label: 'Enable Asteroids', key: 'enable_asteroids', type: 'bool' },
  {
    label: 'Number of Asteroids',
    key: 'num_asteroids',
    type: 'int',
    min: 0,
    max: 500,
    step: 5,
  },
  {
    label: 'Initial Velocity',
    key: 'init_velocity',
    type: 'float',
    min: 0,
    max: 100,
    step: 1,
  },
  {
    label: 'Velocity StdDev',
    key: 'velocity_stddev',
    type: 'float',
    min: 0,
    max: 50,
    step: 1,
  },
  {
    label: 'Input Object Type',
    key: 'input_object_type',
    type: 'option',
    options: [
      'Planet',
      'Star',
      'Asteroid',
      'GasGiant',
      'NeutronStar',
      'WhiteDwarf',
    ],
  },
  { label: '--- Visuals ---', type: 'separator' },
  { label: 'Show Trails', key: 'show_trails', type: 'bool' },
  {
    label: 'Trail Style',
    key: 'trail_style',
    type: 'option',
    options: ['Cloud', 'Simple', 'Glow'],
  },
  {
    label: 'Trail Length',
    key: 'trail_length',
    type: 'int',
    min: 5,
    max: 300,
    step: 5,
  },
  {
    label: 'Show Velocity Vectors',
    key: 'show_velocity_vectors',
    type: 'bool',
  },
  { label: 'Show BH Glow', key: 'show_bh_glow', type: 'bool' },
  { label: 'Show Accretion Disk', key: 'show_accretion_disk', type: 'bool' },
  { label: 'Realistic Disk Physics', key: 'realistic_disk_physics', type: 'bool' },
  { label: 'Show BH Jets', key: 'show_bh_jets', type: 'bool' },
  { label: 'Improved Lensing', key: 'improved_lensing', type: 'bool' },
  {
    label: 'Lensing Strength',
    key: 'lensing_strength',
    type: 'float',
    min: 1,
    max: 1000,
    step: 10,
  },
  {
    label: 'Star Field Density',
    key: 'star_density',
    type: 'int',
    min: 0,
    max: 30000,
    step: 100,
  },
  { label: 'Ambient Lighting', key: 'show_ambient_lighting', type: 'bool' },
  {
    label: 'Dynamic Object Colors',
    key: 'dynamic_object_properties',
    type: 'bool',
  },
  { label: 'Planet Base Color', key: 'planet_base_color', type: 'color' },
  { label: 'Star Base Color', key: 'star_base_color', type: 'color' },
  { label: '--- UI & Control ---', type: 'separator' },
  { label: 'Interactive Add', key: 'interactive_add', type: 'bool' },
  {
    label: 'Follow Mode',
    key: 'follow_mode',
    type: 'option',
    options: [
      'None',
      'BlackHole',
      'Planet',
      'GasGiant',
      'Star',
      'NeutronStar',
      'WhiteDwarf',
    ],
  },
  { label: 'Show Overlays', key: 'show_dynamic_overlays', type: 'bool' },
  { label: 'Record Simulation', key: 'record_simulation', type: 'bool' },
];

const buildSettingsMenu = () => {
  const settingsGrid = document.getElementById('settingsGrid');
  settingsGrid.innerHTML = '';
  localSettings = JSON.parse(JSON.stringify(SETTINGS));

  function updatePresetInfo(presetName) {
    const box = document.getElementById('presetInfo');
    const info = SCENARIO_INFO[presetName];
    if (!info || presetName === 'None') {
      box.innerHTML = '';
      box.style.display = 'none';
      return;
    }
    box.style.display = 'block';
    box.innerHTML = `<h4>${info.title}</h4>${info.summary}`;
  }

  setting_items.forEach(item => {
    if (item.type === 'separator') {
      const sepDiv = document.createElement('div');
      sepDiv.className = 'setting-separator';
      sepDiv.innerHTML = `<h3>${item.label}</h3><div class="line"></div>`;
      settingsGrid.appendChild(sepDiv);
      return;
    }

    const label = document.createElement('div');
    label.className = 'setting-label';
    label.textContent = item.label;
    const controlContainer = document.createElement('div');
    controlContainer.className = 'setting-control';
    const value = localSettings[item.key];

    if (item.type === 'int' || item.type === 'float') {
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = item.min;
      slider.max = item.max;
      slider.step = item.step;
      slider.value = value;
      const valueDisplay = document.createElement('span');
      valueDisplay.className = 'value-display';
      valueDisplay.textContent = Number(value).toFixed(
        item.precision || (item.type === 'float' ? 1 : 0)
      );
      slider.oninput = () => {
        const val =
          item.type === 'int'
            ? parseInt(slider.value)
            : parseFloat(slider.value);
        localSettings[item.key] = val;
        valueDisplay.textContent = val.toFixed(
          item.precision || (item.type === 'float' ? 1 : 0)
        );
        if (
          item.key === 'num_black_holes' ||
          item.key === 'use_individual_bh_masses'
        )
          updateIndivBHMassButtonVisibility();
      };
      controlContainer.append(slider, valueDisplay);
    } else if (item.type === 'bool') {
      const button = document.createElement('button');
      button.className = 'toggle-button';
      button.textContent = value ? 'On' : 'Off';
      button.onclick = () => {
        localSettings[item.key] = !localSettings[item.key];
        button.textContent = localSettings[item.key] ? 'On' : 'Off';
        if (item.key === 'use_individual_bh_masses')
          updateIndivBHMassButtonVisibility();
      };
      controlContainer.appendChild(button);
    } else if (item.type === 'option') {
      const select = document.createElement('select');
      item.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = option.textContent = opt;
        if (opt === value) option.selected = true;
        select.appendChild(option);
      });
      select.onchange = e => {
        localSettings[item.key] = e.target.value;
        if (item.key === 'preset_scenario') {
          updatePresetInfo(e.target.value);
          current_scenario_name = e.target.value;
          // Removed automatic show_scenario_info() call - only show when user clicks buttons
        }
      };
      controlContainer.appendChild(select);
    } else if (item.type === 'color') {
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = value;
      colorInput.oninput = () => {
        localSettings[item.key] = colorInput.value;
      };
      controlContainer.appendChild(colorInput);
    }

    settingsGrid.append(label, controlContainer);

    if (item.key === 'orbit_decay_rate') {
      const bhMassBtnContainer = document.createElement('div');
      bhMassBtnContainer.style.gridColumn = '1 / -1';
      bhMassBtnContainer.style.textAlign = 'center';
      bhMassBtnContainer.innerHTML = `<button id="indivBHMassBtn" class="ui-button" style="margin-top: 10px;">Set Individual BH Masses</button>`;
      settingsGrid.appendChild(bhMassBtnContainer);
      bhMassBtnContainer.firstElementChild.onclick = showIndivBHMassMenu;
    }
  });
  updateIndivBHMassButtonVisibility();
  updatePresetInfo(localSettings.preset_scenario);
};

// BH Masses Modal visibility management - matching original exactly
const updateIndivBHMassButtonVisibility = () => {
  const btn = document.getElementById('indivBHMassBtn');
  if (btn)
    btn.style.display =
      localSettings.use_individual_bh_masses &&
      localSettings.num_black_holes > 1
        ? 'inline-block'
        : 'none';
};

const showIndivBHMassMenu = () => {
  const content = document.getElementById('bhMassesContent');
  content.innerHTML = '';
  const num_bh = localSettings.num_black_holes;
  if (!localSettings.bh_masses || localSettings.bh_masses.length !== num_bh) {
    localSettings.bh_masses = Array(num_bh).fill(localSettings.bh_mass);
  }

  for (let i = 0; i < num_bh; i++) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'bh-mass-item';

    const label = document.createElement('label');
    label.textContent = `Black Hole #${i + 1}:`;

    const controlDiv = document.createElement('div');
    controlDiv.className = 'bh-mass-control';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0.1;
    slider.max = 1000;
    slider.step = 0.1;
    slider.value = localSettings.bh_masses[i];
    slider.dataset.index = i;

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'value-display';
    valueDisplay.textContent = `${Number(slider.value).toFixed(1)} Msun`;

    slider.oninput = e => {
      const index = parseInt(e.target.dataset.index, 10);
      const val = parseFloat(e.target.value);
      localSettings.bh_masses[index] = val;
      valueDisplay.textContent = `${val.toFixed(1)} Msun`;
    };

    controlDiv.append(slider, valueDisplay);
    itemDiv.append(label, controlDiv);
    content.appendChild(itemDiv);
  }
  document.getElementById('bhMassesModal').classList.remove('hidden');
};

// Legacy function for backward compatibility
const showBHMassesModal = () => {
  showIndivBHMassMenu();
};

const hideBHMassesModal = () => {
  document.getElementById('bhMassesModal').classList.add('hidden');
};

// Save/Load functions
/**
 * Save the current simulation state to localStorage
 * Includes all settings, object states, and view parameters
 */
const save_simulation_state = () => {
  try {
    const savedState = {
      settings: SETTINGS,
      view: { zoom: state.zoom, pan: state.pan },
      objects: [
        ...bh_list.map(o => o.get_state()),
        ...planets.map(o => o.get_state()),
        ...stars.map(o => o.get_state()),
        ...gas_giants.map(o => o.get_state()),
        ...asteroids.map(o => o.get_state()),
        ...neutron_stars.map(o => o.get_state()),
        ...white_dwarfs.map(o => o.get_state()),
        ...debris.map(o => o.get_state()),
      ],
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(savedState));
    alert('Simulation state saved!');
  } catch (e) {
    console.error('Error saving state:', e);
    alert('Failed to save simulation state.');
  }
};

/**
 * Load a previously saved simulation state from localStorage
 * Restores all settings, objects, and view parameters
 */
const load_simulation_state = () => {
  const scenarioInfoDiv = document.getElementById('scenarioInfoDisplay');
  scenarioInfoDiv.classList.remove('visible');

  const savedJSON = localStorage.getItem(SAVE_KEY);
  if (!savedJSON) {
    alert('No saved state found.');
    return;
  }
  try {
    const loadedState = JSON.parse(savedJSON);
    SETTINGS = loadedState.settings || { ...DEFAULT_SETTINGS };
    const view = loadedState.view || { zoom: 1.5, pan: { x: 0, y: 0 } };
    state.zoom = view.zoom;
    state.pan = view.pan;
    bh_list.length = 0;
    planets.length = 0;
    stars.length = 0;
    gas_giants.length = 0;
    asteroids.length = 0;
    neutron_stars.length = 0;
    white_dwarfs.length = 0;
    debris.length = 0;
    particles.length = 0;
    resetPhysicsObjectCounter();
    let max_id = 0;
    loadedState.objects.forEach(obj_state => {
      const { type, pos, vel, mass } = obj_state;
      let new_obj = null;
      if (type === 'Planet') new_obj = new Planet(pos, vel);
      else if (type === 'GasGiant') new_obj = new GasGiant(pos, vel);
      else if (type === 'Asteroid') new_obj = new Asteroid(pos, vel);
      else if (type === 'StarObject') new_obj = new StarObject(pos, vel);
      else if (type === 'NeutronStar') new_obj = new NeutronStar(pos, vel);
      else if (type === 'WhiteDwarf') new_obj = new WhiteDwarf(pos, vel);
      else if (type === 'Debris') new_obj = new Debris(pos, vel);
      else if (type === 'BlackHole') new_obj = new BlackHole(pos, mass, vel);
      if (new_obj) {
        new_obj.set_state(obj_state);
        if (new_obj instanceof Planet) planets.push(new_obj);
        else if (new_obj instanceof GasGiant) gas_giants.push(new_obj);
        else if (new_obj instanceof Asteroid) asteroids.push(new_obj);
        else if (new_obj instanceof StarObject) stars.push(new_obj);
        else if (new_obj instanceof NeutronStar) neutron_stars.push(new_obj);
        else if (new_obj instanceof WhiteDwarf) white_dwarfs.push(new_obj);
        else if (new_obj instanceof Debris) debris.push(new_obj);
        else if (new_obj instanceof BlackHole) bh_list.push(new_obj);
        max_id = Math.max(max_id, new_obj.id || 0);
      }
    });
    setPhysicsObjectCounter(max_id + 1);
    alert('Simulation state loaded!');
    state.paused = false;
    updateSpeedDisplay();
  } catch (e) {
    console.error('Error loading state:', e);
    alert('Failed to load state.');
  }
};

// Utility functions
/**
 * Update the speed display in the UI to show current simulation speed
 */
const updateSpeedDisplay = () => {
  const speedDisplay = document.getElementById('speedDisplay');
  speedDisplay.textContent = `${SETTINGS.sim_speed.toFixed(1)}x`;
};

/**
 * Take a screenshot of the current simulation
 * Combines the starfield and simulation canvases into a single image
 */
const takeScreenshot = () => {
  try {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    tempCtx.drawImage(starfieldCanvas, 0, 0);
    tempCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `gravitas-screenshot-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL();
    link.click();
  } catch (error) {
    console.error('Screenshot failed:', error);
    alert('Screenshot failed. Please try again.');
  }
};

// Object type cycling functionality
const objectTypes = [
  { type: "Star", emoji: "⭐", label: "Add Stars" },
  { type: "Planet", emoji: "🪐", label: "Add Planets" },
  { type: "GasGiant", emoji: "🪐", label: "Add Gas Giants" },
  { type: "Asteroid", emoji: "☄️", label: "Add Asteroids" },
  { type: "Comet", emoji: "☄️", label: "Add Comets" },
  { type: "NeutronStar", emoji: "⚡", label: "Add Neutron Stars" },
  { type: "WhiteDwarf", emoji: "💎", label: "Add White Dwarfs" },
  { type: "BlackHole", emoji: "⚫", label: "Add Black Holes" }
];

let currentTypeIndex = 0;

// Function to generate random black hole mass based on existing black holes
const generateRandomBlackHoleMass = () => {
  // Find the largest black hole mass in the simulation
  let largestMass = SETTINGS.bh_mass * SOLAR_MASS_UNIT; // Default fallback
  
  if (bh_list.length > 0) {
    largestMass = Math.max(...bh_list.map(bh => bh.mass));
  }
  
  // Convert to solar masses for easier calculation
  const largestMassInSuns = largestMass / SOLAR_MASS_UNIT;
  
  // Generate random mass with normal distribution centered around largest mass
  // Use a wider spread for more variety (±50% of the largest mass)
  const spread = largestMassInSuns * 0.5;
  const minMass = Math.max(1.0, largestMassInSuns - spread); // At least 1 solar mass
  const maxMass = largestMassInSuns + spread;
  
  // Generate random value with bias toward center (using two random numbers for normal-ish distribution)
  const random1 = Math.random();
  const random2 = Math.random();
  const normalRandom = (random1 + random2) / 2; // Rough approximation of normal distribution
  
  const randomMassInSuns = minMass + (maxMass - minMass) * normalRandom;
  return randomMassInSuns * SOLAR_MASS_UNIT;
};

const updateObjectTypeButton = () => {
  const btn = document.getElementById('objectTypeBtn');
  if (!btn) return; // Guard against missing button
  const currentType = objectTypes[currentTypeIndex];
  btn.innerHTML = `${currentType.emoji} ${currentType.label}`;
  btn.title = `Click to change what type of object you insert (currently: ${currentType.type})`;
  SETTINGS.input_object_type = currentType.type;
};

// Event handlers
canvas.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  
  // Mark that user has interacted with the page
  state.user_has_interacted = true;
  
  // Check if click is in UI area
  const uiContainer = document.querySelector('.ui-container');
  const uiRect = uiContainer.getBoundingClientRect();
  if (e.clientX > uiRect.left) {
    return;
  }

  const worldPos = screen_to_world({ x: e.clientX, y: e.clientY });
  const clickedObject = findObjectAtPosition(worldPos);

  if (clickedObject) {
    // Always show inspector when clicking on an object
    showObjectInspector(clickedObject.object, clickedObject.type);
    return;
  }

  // Only close inspector if we clicked on empty space and inspector is open
  if (state.inspector_open && !clickedObject) {
    hideObjectInspector();
    return;
  }

  // Regular click handling for adding objects
  state.mouse.down = true;
  if (SETTINGS.interactive_add) {
    state.adding_mass = true;
    state.add_start_screen = { x: e.clientX, y: e.clientY };
    state.add_start_world = screen_to_world(state.add_start_screen);
  }
});

window.addEventListener('mousemove', e => {
  state.mouse.x = e.clientX;
  state.mouse.y = e.clientY;
  if (state.mouse.down && !state.adding_mass) {
    state.pan.x += e.movementX;
    state.pan.y += e.movementY;
  }
});

window.addEventListener('mouseup', e => {
  if (e.button !== 0) return;
  state.mouse.down = false;
  if (state.adding_mass) {
    state.adding_mass = false;
    const add_end_world = screen_to_world({ x: e.clientX, y: e.clientY });
    const vel = {
      x: (add_end_world.x - state.add_start_world.x) * 3,
      y: (add_end_world.y - state.add_start_world.y) * 3,
    };
    const type = SETTINGS.input_object_type;
    let new_obj;
    if (type === 'Planet') new_obj = new Planet(state.add_start_world, vel);
    else if (type === 'Star')
      new_obj = new StarObject(state.add_start_world, vel);
    else if (type === 'Asteroid')
      new_obj = new Asteroid(state.add_start_world, vel);
    else if (type === 'GasGiant')
      new_obj = new GasGiant(state.add_start_world, vel);
    else if (type === 'NeutronStar')
      new_obj = new NeutronStar(state.add_start_world, vel);
    else if (type === 'WhiteDwarf')
      new_obj = new WhiteDwarf(state.add_start_world, vel);
    else if (type === 'Comet')
      new_obj = new Comet(state.add_start_world, vel);
    else if (type === 'BlackHole') {
      const randomMass = generateRandomBlackHoleMass();
      new_obj = new BlackHole(state.add_start_world, randomMass, vel);
    }

    if (new_obj instanceof Planet) planets.push(new_obj);
    if (new_obj instanceof StarObject) stars.push(new_obj);
    if (new_obj instanceof Asteroid) asteroids.push(new_obj);
    if (new_obj instanceof GasGiant) gas_giants.push(new_obj);
    if (new_obj instanceof NeutronStar) neutron_stars.push(new_obj);
    if (new_obj instanceof WhiteDwarf) white_dwarfs.push(new_obj);
    if (new_obj instanceof Comet) asteroids.push(new_obj);
    if (new_obj instanceof BlackHole) bh_list.push(new_obj);
  }
});

window.addEventListener(
  'wheel',
  e => {
    if (e.target !== canvas) return;
    e.preventDefault();
    
    // Use a smaller zoom factor for smoother zooming
    const zoomFactor = 1.05; // Reduced from 1.1
    const oldZoom = state.zoom;
    let newZoom = e.deltaY < 0 ? oldZoom * zoomFactor : oldZoom / zoomFactor;
    newZoom = Math.max(0.01, Math.min(newZoom, 100));
    
    // Get the world position at the mouse cursor (using current zoom and pan)
    const worldPos = screen_to_world({ x: e.clientX, y: e.clientY });
    
    // Update zoom
    state.zoom = newZoom;
    
    // Calculate where that world position should be on screen with the new zoom
    const newScreenPos = worldToScreen(worldPos, state, canvas);
    
    // Calculate the difference and adjust pan to keep the mouse position fixed
    const deltaX = newScreenPos.x - e.clientX;
    const deltaY = newScreenPos.y - e.clientY;
    
    state.pan.x -= deltaX;
    state.pan.y -= deltaY;
  },
  { passive: false }
);

window.addEventListener('keydown', e => {
  const panSpeed = 40 / state.zoom;
  if (e.key === ' ') {
    state.paused = !state.paused;
    e.preventDefault();
  } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a')
    state.pan.x += panSpeed;
  else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd')
    state.pan.x -= panSpeed;
  else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w')
    state.pan.y += panSpeed;
  else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's')
    state.pan.y -= panSpeed;
  else if (e.key.toLowerCase() === 'home') {
    state.zoom = 1.0;
    state.pan = { x: 0, y: 0 };
  } else if (e.key === '-' || e.key === '_') {
    SETTINGS.sim_speed = Math.max(0.1, SETTINGS.sim_speed - 0.2);
    updateSpeedDisplay();
  } else if (e.key === '=' || e.key === '+') {
    SETTINGS.sim_speed = Math.min(5.0, SETTINGS.sim_speed + 0.2);
    updateSpeedDisplay();
  } else if (e.key.toLowerCase() === 'p') {
    takeScreenshot();
  } else if (e.key === 'Escape') {
    console.log('Escape key pressed, inspector_open:', state.inspector_open);
    if (state.inspector_open) {
      hideObjectInspector();
    }
  }
});

// Button event handlers
document.getElementById('inspectorClose').onclick = hideObjectInspector;
document.getElementById('settingsBtn').onclick = () => {
  buildSettingsMenu();
  document.getElementById('settingsPanel').classList.remove('hidden');
  state.paused = true;
};
document.getElementById('refreshScenarioBtn').onclick = () => {
  // Preserve current scenario name and restart it
  const currentScenario = current_scenario_name || 'Binary BH';
  SETTINGS.preset_scenario = currentScenario;
  initialize_simulation();
  state.paused = false;
  show_scenario_info();
  updateSpeedDisplay();
};
document.getElementById('resetAllBtn').onclick = () => {
  // Reset to default settings and ensure Binary BH scenario
  SETTINGS = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  SETTINGS.preset_scenario = 'Binary BH'; // Ensure default scenario
  initialize_simulation();
  state.paused = false;
  show_scenario_info();
  updateSpeedDisplay();
};
document.getElementById('saveBtn').onclick = save_simulation_state;
document.getElementById('loadBtn').onclick = load_simulation_state;
document.getElementById('settingsApply').onclick = () => {
  SETTINGS = JSON.parse(JSON.stringify(localSettings));
  document.getElementById('settingsPanel').classList.add('hidden');
  initialize_simulation();
  state.paused = false;
  show_scenario_info();
  updateSpeedDisplay();
};
document.getElementById('settingsReset').onclick = () => {
  localSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  buildSettingsMenu();
};
document.getElementById('settingsCancel').onclick = () => {
  document.getElementById('settingsPanel').classList.add('hidden');
  state.paused = false;
};

// BH Masses Modal event handlers
document.getElementById('bhMassesDone').onclick = hideBHMassesModal;

// Speed control functionality
document.getElementById('slowDownBtn').onclick = () => {
  SETTINGS.sim_speed = Math.max(0.1, SETTINGS.sim_speed - 0.2);
  updateSpeedDisplay();
};

document.getElementById('speedUpBtn').onclick = () => {
  SETTINGS.sim_speed = Math.min(5.0, SETTINGS.sim_speed + 0.2);
  updateSpeedDisplay();
};

// Reset view functionality - improved to center on main objects
document.getElementById('resetViewBtn').onclick = () => {
  // Collect all objects to find the center of mass
  const allObjects = [
    ...bh_list,
    ...stars,
    ...neutron_stars,
    ...white_dwarfs,
    ...gas_giants,
    ...planets,
    ...asteroids
  ].filter(obj => obj.alive);
  
  if (allObjects.length > 0) {
    // Calculate center of mass
    let totalMass = 0;
    let centerX = 0;
    let centerY = 0;
    
    for (const obj of allObjects) {
      totalMass += obj.mass;
      centerX += obj.pos.x * obj.mass;
      centerY += obj.pos.y * obj.mass;
    }
    
    if (totalMass > 0) {
      centerX /= totalMass;
      centerY /= totalMass;
    }
    
    // Calculate bounds to determine appropriate zoom level
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const obj of allObjects) {
      minX = Math.min(minX, obj.pos.x);
      maxX = Math.max(maxX, obj.pos.x);
      minY = Math.min(minY, obj.pos.y);
      maxY = Math.max(maxY, obj.pos.y);
    }
    
    // Add some padding around the objects
    const padding = 50;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    
    // Calculate zoom to fit all objects on screen
    const zoomX = canvas.width / width;
    const zoomY = canvas.height / height;
    const newZoom = Math.min(zoomX, zoomY, 2.0); // Cap zoom at 2.0x
    
    // Set the view to center on the objects
    state.zoom = Math.max(0.1, newZoom);
    state.pan.x = -centerX * state.zoom;
    state.pan.y = centerY * state.zoom;
  } else {
    // Fallback to default view if no objects
    state.zoom = 1.0;
    state.pan = { x: 0.0, y: 0.0 };
  }
};

// Screenshot functionality
document.getElementById('screenshotBtn').onclick = takeScreenshot;

// Object type cycling functionality
document.getElementById('objectTypeBtn').onclick = () => {
  currentTypeIndex = (currentTypeIndex + 1) % objectTypes.length;
  updateObjectTypeButton();
};

// Mobile instructions close button
document.getElementById('closeMobileInstructions').onclick = () => {
  document.getElementById('mobileInstructions').style.display = 'none';
};

// Touch event handlers for mobile
canvas.addEventListener(
  'touchstart',
  e => {
    e.preventDefault();
    const touchCount = e.touches.length;
    const touchStartTime = Date.now();

    // Mark that user has interacted with the page
    state.user_has_interacted = true;

    if (touchCount === 1) {
      const touch = e.touches[0];
      const touchStartPos = { x: touch.clientX, y: touch.clientY };
      state.touch_active = true;
      state.touch_id = touch.identifier;

      // Check for object interaction
      const worldPos = screen_to_world(touchStartPos);
      const clickedObject = findObjectAtPosition(worldPos);

      if (clickedObject) {
        // Always show inspector when touching an object
        showObjectInspector(clickedObject.object, clickedObject.type);
        return;
      }

      // Only close inspector if we touched empty space
      if (state.inspector_open && !clickedObject) {
        hideObjectInspector();
        return;
      }

      if (SETTINGS.interactive_add) {
        state.adding_mass = true;
        state.add_start_screen = touchStartPos;
        state.add_start_world = worldPos;
      }
    }
  },
  { passive: false }
);

canvas.addEventListener(
  'touchmove',
  e => {
    e.preventDefault();
    const touchCount = e.touches.length;

    if (touchCount === 1 && state.touch_active) {
      const touch = e.touches[0];
      const currentPos = { x: touch.clientX, y: touch.clientY };

      if (!state.adding_mass) {
        // Pan the view
        const deltaX = currentPos.x - (state.lastTouchPos?.x || currentPos.x);
        const deltaY = currentPos.y - (state.lastTouchPos?.y || currentPos.y);
        state.pan.x += deltaX;
        state.pan.y += deltaY;
      }

      state.lastTouchPos = currentPos;
    } else if (touchCount === 2) {
      // Pinch zoom handling
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      if (state.lastTouchDistance > 0) {
        const zoomFactor = currentDistance / state.lastTouchDistance;
        
        // Limit the zoom factor per frame to prevent excessive zooming
        const limitedZoomFactor = Math.max(0.95, Math.min(zoomFactor, 1.05));
        
        const oldZoom = state.zoom;
        let newZoom = oldZoom * limitedZoomFactor;
        newZoom = Math.max(0.01, Math.min(newZoom, 100));

        // Zoom towards the center of the two touches
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        
        // Get the world position at the center of the pinch
        const worldPos = screen_to_world({ x: centerX, y: centerY });
        
        // Update zoom
        state.zoom = newZoom;
        
        // Calculate where the center point should be on screen with the new zoom
        const newScreenPos = worldToScreen(worldPos, state, canvas);
        
        // Calculate the difference and adjust pan to keep the pinch center fixed
        const deltaX = newScreenPos.x - centerX;
        const deltaY = newScreenPos.y - centerY;
        
        state.pan.x -= deltaX;
        state.pan.y -= deltaY;
      }

      state.lastTouchDistance = currentDistance;
    }
  },
  { passive: false }
);

canvas.addEventListener(
  'touchend',
  e => {
    e.preventDefault();
    const touchCount = e.touches.length;

    if (touchCount === 0) {
      if (state.adding_mass) {
        // Add object with velocity
        const touch = e.changedTouches[0];
        const add_end_world = screen_to_world({
          x: touch.clientX,
          y: touch.clientY,
        });
        const vel = {
          x: (add_end_world.x - state.add_start_world.x) * 3,
          y: (add_end_world.y - state.add_start_world.y) * 3,
        };
        const type = SETTINGS.input_object_type;
        let new_obj;
        if (type === 'Planet') new_obj = new Planet(state.add_start_world, vel);
        else if (type === 'Star')
          new_obj = new StarObject(state.add_start_world, vel);
        else if (type === 'Asteroid')
          new_obj = new Asteroid(state.add_start_world, vel);
        else if (type === 'GasGiant')
          new_obj = new GasGiant(state.add_start_world, vel);
        else if (type === 'NeutronStar')
          new_obj = new NeutronStar(state.add_start_world, vel);
        else if (type === 'WhiteDwarf')
          new_obj = new WhiteDwarf(state.add_start_world, vel);
        else if (type === 'Comet')
          new_obj = new Comet(state.add_start_world, vel);
        else if (type === 'BlackHole') {
          const randomMass = generateRandomBlackHoleMass();
          new_obj = new BlackHole(state.add_start_world, randomMass, vel);
        }

        if (new_obj instanceof Planet) planets.push(new_obj);
        if (new_obj instanceof StarObject) stars.push(new_obj);
        if (new_obj instanceof Asteroid) asteroids.push(new_obj);
        if (new_obj instanceof GasGiant) gas_giants.push(new_obj);
        if (new_obj instanceof NeutronStar) neutron_stars.push(new_obj);
        if (new_obj instanceof WhiteDwarf) white_dwarfs.push(new_obj);
        if (new_obj instanceof Comet) asteroids.push(new_obj);
        if (new_obj instanceof BlackHole) bh_list.push(new_obj);

        state.adding_mass = false;
      }
      
      state.touch_active = false;
      state.touch_id = null;
      state.lastTouchPos = null;
      state.lastTouchDistance = 0;
    }
  },
  { passive: false }
);

// Export functions and variables
export {
  showObjectInspector,
  hideObjectInspector,
  getBlackHoleInfo,
  getStarInfo,
  getPlanetInfo,
  getGasGiantInfo,
  getAsteroidInfo,
  getNeutronStarInfo,
  getWhiteDwarfInfo,
  showBHMassesModal,
  hideBHMassesModal,
  show_scenario_info,
  apply_preset,
  initialize_simulation,
  buildSettingsMenu,
  save_simulation_state,
  load_simulation_state,
  updateSpeedDisplay,
  takeScreenshot,
  updateObjectTypeButton,
  getRandomName,
  SETTINGS,
  state,
  current_scenario_name,
  DEFAULT_SETTINGS,
  localSettings,
};
