// UI and event handling functions

import {
  screen_to_world,
  bh_list,
  planets,
  stars,
  gas_giants,
  asteroids,
  comets,
  debris,
  particles,
  gravity_ripples,
  neutron_stars,
  white_dwarfs,
  accretion_disk_particles,
  resetPhysicsObjectCounter,
  setPhysicsObjectCounter,
  SOLAR_MASS_UNIT,
  EARTH_MASS_UNIT,
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
  // Energy calculation functions
  getObjectEnergyHistory,
  clearObjectEnergyHistory,
  clearAllEnergyHistory,
  calculateObjectEnergy,
  getAllPhysicsObjects,
} from './physics.js';

import { worldToScreen } from './utils.js';
import { generateStarfield } from './render.js';
import { initChart, updateChart, clearChart, exportChart } from './energyChartNew.js';

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

// Immediately hide object inspector when module loads
if (typeof document !== 'undefined') {
  const objectInspector = document.getElementById('objectInspector');
  if (objectInspector) {
    objectInspector.classList.remove('visible');
    objectInspector.classList.remove('showUI');
    objectInspector.style.display = 'none';
    objectInspector.style.opacity = '0';
    objectInspector.style.visibility = 'hidden';
    objectInspector.style.pointerEvents = 'none';
  }
}

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
  num_stars: 0,
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
  show_dynamic_overlays: true,
  enable_asteroids: true,
  num_asteroids: 10,
  num_comets: 0,
  dynamic_object_properties: true,
  record_simulation: false,
  show_ambient_lighting: true,
  planet_base_color: '#6495ed',
  star_base_color: '#ffff00',
  enable_star_merging: true,
  max_star_mass_before_bh: 20.0,
  show_gravitational_waves: true, // Enable GW visualization by default
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

// Expanded scenario information
const SCENARIO_INFO = {
  'Solar System': {
    title: 'Solar System',
    summary:
      'A simulation of our Solar System featuring real planets with correct masses, orbital distances, diameters, and colors. Includes Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune with their actual properties, plus real asteroids (Ceres, Vesta, Pallas) and famous comets (Halley, Hale-Bopp, Hyakutake) with authentic orbital periods and characteristics.',
  },
  'Earth-Moon System': {
    title: 'Earth-Moon System',
    summary:
      'A detailed simulation of the Earth-Moon system with accurate masses, orbital mechanics, and realistic appearances. Features Earth with its blue oceans and green continents, and the Moon with its characteristic gray surface and craters. Perfect for studying orbital dynamics and tidal effects.',
  },
  'TRAPPIST-1 System': {
    title: 'TRAPPIST-1 System',
    summary:
      'A compact planetary system with seven Earth-sized worlds orbiting a cool red dwarf star just 40 light-years away. All planets are packed close to their tiny sun, with several in the habitable zone. Can you keep this delicate system stable?',
  },
  'GW150914': {
    title: 'GW150914: First Gravitational Wave Merger',
    summary: 'Simulates the historic merger of two massive black holes (36 & 29 M☉) detected by LIGO in 2015. Watch as they spiral together, emit gravitational waves, and merge into a single, more massive black hole.'
  },
  'Binary BH': {
    title: 'Binary Black Hole',
    summary:
      'Two stellar-mass black holes (15 & 10 M☉) locked in mutual orbit with spectacular relativistic jets. Watch as they spiral together, create gravitational waves, and eventually merge into a single, more massive black hole. The jets point in random directions for each black hole, creating a dynamic cosmic display.',
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
      "An accurate simulation of our Solar System's Kuiper Belt featuring real dwarf planets (Pluto, Eris, Haumea, Makemake), large KBOs (Quaoar, Sedna, Orcus, Varuna), and smaller objects (Ixion, Huya, 2002 AW197) with realistic masses and orbital properties.",
  },
  'Sagittarius A*': {
    title: 'Sagittarius A*',
    summary:
      "The Milky Way's central supermassive black hole (4000 M☉, scaled down for simulation) with fast-moving S-stars, compact objects, and debris in extreme orbits. Witness the incredible gravitational forces and relativistic effects near our galaxy's supermassive black hole.",
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
  'Quasar Cannon': {
    title: 'Quasar Cannon',
    summary: 'A supermassive black hole is actively feeding on a dense star cluster. Watch a beam of light form as stars spiral inward.'
  },
  'The Pinwheel Galaxy Core': {
    title: 'The Pinwheel Galaxy Core',
    summary: 'Two intermediate black holes in the center of a stellar disk. The disk forms a rotating pinwheel pattern as stars are slung around.'
  },
  'Star Frisbee': {
    title: 'Star Frisbee',
    summary: 'A dense stellar disk thrown past a rogue black hole. Will it be shredded or survive the flyby?'
  },
  'Kessler Cascade': {
    title: 'Kessler Cascade',
    summary: 'Hundreds of micro‑stars orbiting chaotically, colliding and ejecting like a debris cloud.'
  },
  'Alien Dyson Swarm Collapse': {
    title: 'Alien Dyson Swarm Collapse',
    summary: 'A hypothetical Dyson swarm of artificial satellites falls into a black hole after a catastrophic orbital failure.'
  },
  'Tidal Arm Tango': {
    title: 'Tidal Arm Tango',
    summary: 'Two black holes dance past each other, flinging stars into massive tidal arms like colliding galaxies.'
  },
  'Hungry Hungry Holes': {
    title: 'Hungry Hungry Holes',
    summary: 'Four black holes at the corners of a square, pulling stars from a shared central cluster.'
  },
  'Slingshot Gauntlet': {
    title: 'Slingshot Gauntlet',
    summary: 'A fast-moving star fired through a black hole obstacle course. Watch gravitational slingshots.'
  },
  'Black Hole Billiards': {
    title: 'Black Hole Billiards',
    summary: 'A few small black holes orbiting a supermassive one, perturbing each other and creating chaotic motion.'
  },
  'Stellar Nursery': {
    title: 'Stellar Nursery',
    summary: 'A dense cluster of young stars around a proto-black hole. Watch interactions and ejections as the cluster evolves.'
  },
};

// Object inspection functions - copied from working original file
const PLANET_RADIUS = 5; // From physics.js
const GAS_GIANT_RADIUS = 8; // From physics.js
const STAR_OBJ_RADIUS = 20; // From physics.js
const NEUTRON_STAR_RADIUS = 3; // From physics.js
const WHITE_DWARF_RADIUS = 8; // From physics.js
const ASTEROID_RADIUS = 2; // From physics.js

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
    
    // Real surface temperature estimate based on mass
    const surfaceTemperature = 3000 + (massInSuns - 0.2) * 4000; // K
    
    // Real luminosity in solar units
    const luminosity = Math.pow(massInSuns, 3.5); // Solar luminosity units
    
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
            { label: 'Surface Temperature', value: `${surfaceTemperature.toFixed(0)} K` },
            { label: 'Luminosity', value: `${luminosity.toFixed(2)} L☉` },
            { label: 'Surface Gravity', value: `${surfaceGravity.toFixed(0)} m/s²` },
            { label: 'Escape Velocity', value: `${(escapeVelocity/1000).toFixed(1)} km/s` },
            { label: 'Spectral Type', value: spectralType },
            { label: 'Lifespan', value: `${age.toFixed(1)} billion years` },
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
    const massInEarths = massInJupiters * 317.8; // Convert Jupiter mass to Earth mass (1 Jupiter = 317.8 Earth masses)
    const radiusInJupiters = gasGiant.radius / GAS_GIANT_RADIUS;
    const radiusInEarths = radiusInJupiters * 11.2; // Convert Jupiter radius to Earth radius (1 Jupiter = 11.2 Earth radii)
    const radiusInKm = radiusInEarths * 6371; // Earth radius in km
    const massInKg = massInEarths * 5.972e24; // Earth mass in kg
    
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
            { label: 'Mass', value: `${massInEarths.toFixed(1)} M⊕ (${massInKg.toExponential(2)} kg)` },
            { label: 'Radius', value: `${radiusInEarths.toFixed(1)} R⊕ (${radiusInKm.toFixed(0)} km)` },
            { label: 'Density', value: `${density.toFixed(0)} kg/m³` },
            { label: 'Surface Gravity', value: `${surfaceGravity.toFixed(1)} m/s²` },
            { label: 'Escape Velocity', value: `${(escapeVelocity/1000).toFixed(1)} km/s` },
            { label: 'Orbital Period', value: orbitalPeriodDays > 365 ? `${(orbitalPeriodDays/365).toFixed(1)} years` : `${orbitalPeriodDays.toFixed(1)} days` },
            { label: 'Type', value: displayType },
            { label: 'Position', value: `(${gasGiant.pos.x.toFixed(1)}, ${gasGiant.pos.y.toFixed(1)})` },
            { label: 'Velocity', value: `${Math.hypot(gasGiant.vel.x, gasGiant.vel.y).toFixed(1)} units/s` }
        ],
        description: `A ${displayType.toLowerCase()} with ${massInEarths > 3000 ? 'enormous' : massInEarths > 1000 ? 'substantial' : 'moderate'} mass. ${giantType === 'brown_dwarf' ? 'This object is massive enough to fuse deuterium but not hydrogen, making it a failed star.' : giantType === 'super_jupiter' ? 'This massive gas giant has extreme atmospheric pressures and may have formed directly from a protoplanetary disk.' : giantType === 'jupiter_like' ? 'This Jupiter-like planet has a thick hydrogen-helium atmosphere with distinctive banding patterns.' : giantType === 'neptune_like' ? 'This Neptune-like ice giant has a composition rich in water, ammonia, and methane ices.' : 'This mini-Neptune has a substantial atmosphere but is smaller than typical gas giants.'}`
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
    
    // Check if splash screen is still active using both the global flag and our state variable
    if (!window.splashScreenEnded || window.isSplashActive) {
        console.log('Splash screen still active, completely ignoring showObjectInspector call');
        return;
    }
    
    // Check if inspector element exists
    const objectInspector = document.getElementById('objectInspector');
    if (!objectInspector) {
        console.error('objectInspector element not found!');
        return;
    }
    
    // Check if we're already showing the same object
    if (state.inspector_open && 
        state.selectedObject && 
        state.selectedObject.object && 
        state.selectedObject.object.id === object.id &&
        state.selectedObject.type === type) {
        console.log('Inspector already open for this object, skipping');
        return;
    }
    
    // Store the current object for auto-updating
    state.selectedObject = { object, type };
    
    const updateInspector = () => {
        if (!state.inspector_open || !state.selectedObject) return;
        
        // Skip updates if slider is being dragged
        if (state.sliderDragging) {
            return;
        }
        
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
        const detailsTabContent = document.getElementById('detailsTab');
        
        if (!inspectorTitle || !detailsTabContent) {
            // Silently return instead of logging error - elements may not exist during initialization
            return;
        }
        
        inspectorTitle.innerHTML = `<span class="object-icon">${info.icon}</span>${info.title}`;
        
        // Check if this is a new object selection or just a real-time update
        const existingMassSlider = document.getElementById('massSlider');
        const isNewObject = !existingMassSlider || 
                           (state.selectedObject && state.selectedObject.object && 
                            existingMassSlider.dataset.objectId !== state.selectedObject.object.id);
        
        // Don't recreate inspector if it's just a mass update (to preserve energy chart)
        // TODO: REMOVE - Energy chart preservation logic to be replaced
        const isMassUpdate = existingMassSlider && 
                            state.selectedObject && 
                            state.selectedObject.object && 
                            existingMassSlider.dataset.objectId === state.selectedObject.object.id &&
                            Math.abs(parseFloat(existingMassSlider.value) - state.selectedObject.object.mass) < 0.1;
        
        if (isNewObject && !isMassUpdate) {
                    // Reset energy log when switching to a new object
        // TODO: REMOVE - Energy log reset to be replaced
        state.energyLog = [];
            // New object selected - recreate the entire inspector
            let content = '';
            
            // Add mass adjustment slider
            const massSlider = createMassSlider(state.selectedObject.object, state.selectedObject.type);
            content += massSlider;
            
            // Add separator
            content += '<div class="stat-separator"></div>';
            
            info.stats.forEach(stat => {
                content += `
                    <div class="stat-row">
                        <span class="stat-label">${stat.label}:</span>
                        <span class="stat-value">${stat.value}</span>
                    </div>
                `;
            });
            
            content += `<div class="object-description">${info.description}</div>`;
            
        detailsTabContent.innerHTML = content;
            
            // Set up mass slider event listeners
            setupMassSliderListeners();
            
            // Store object ID for future reference
            const newMassSlider = document.getElementById('massSlider');
            if (newMassSlider && state.selectedObject.object) {
                newMassSlider.dataset.objectId = state.selectedObject.object.id || 'unknown';
            }
        } else if (isNewObject && isMassUpdate) {
            // Just update the mass slider value without recreating the inspector
            const existingMassSlider = document.getElementById('massSlider');
            if (existingMassSlider) {
                existingMassSlider.value = state.selectedObject.object.mass;
            }
        } else {
            // Real-time update - only update stats and description, preserve the slider
            const statRows = detailsTabContent.querySelectorAll('.stat-row');
            const description = detailsTabContent.querySelector('.object-description');
            
            // Update stats
            info.stats.forEach((stat, index) => {
                if (statRows[index]) {
                    statRows[index].innerHTML = `
                        <span class="stat-label">${stat.label}:</span>
                        <span class="stat-value">${stat.value}</span>
                    `;
                }
            });
            
            // Update description
            if (description) {
                description.innerHTML = info.description;
            }
        }
        
        // Update energy chart if energy tab is active
        const energyTab = document.querySelector('.inspector-tab[data-tab="energy"]');
        if (energyTab && energyTab.classList.contains('active')) {
            updateEnergyChart();
        }
    };
    
    // Clear any existing update interval
    if (state.inspectorUpdateInterval) {
        clearInterval(state.inspectorUpdateInterval);
        state.inspectorUpdateInterval = null;
    }
    
    // Initial update
    updateInspector();
    
    // Set up auto-update interval
    state.inspectorUpdateInterval = setInterval(updateInspector, 100); // Update 10 times per second
    
    // Remove inline hide styles so CSS takes over
    ['display', 'opacity', 'visibility', 'pointerEvents', 'position', 'left', 'top', 'zIndex'].forEach(prop => {
        objectInspector.style[prop] = '';
    });
    
    // Show the inspector
    objectInspector.classList.add('visible');
    
    // Ensure the showUI class is also present (added after splash screen ends)
    if (!objectInspector.classList.contains('showUI')) {
        objectInspector.classList.add('showUI');
    }
    
    state.inspector_open = true;
    
    // Ensure inspector starts in centered position
    objectInspector.style.left = '';
    objectInspector.style.top = '';
    objectInspector.style.transform = 'translate(-50%, -50%)';
    
    // Set up mobile-friendly backdrop click to close
    setupInspectorBackdropClick();
    
    // Set up dragging functionality with a small delay to ensure proper positioning
    setTimeout(() => {
        setupInspectorDragging();
    }, 50);
    
    // Set up energy tab functionality
    setupEnergyTab();
    
    // Initialize energy chart immediately for new object selection
    // This ensures the chart is ready even if the energy tab isn't active
    setTimeout(() => {
        ensureChartReady();
        updateEnergyChart();
    }, 100); // Small delay to ensure DOM elements are ready
    
    // Update cursor state
    updateInspectorCursor();
    
    // Set up overlay minimize functionality
    setupOverlayMinimize();
};

const hideObjectInspector = () => {
    const objectInspector = document.getElementById('objectInspector');
    if (!objectInspector) {
        console.error('objectInspector element not found when trying to hide!');
        return;
    }
    objectInspector.classList.remove('visible');
    objectInspector.classList.remove('dragging');
    state.inspector_open = false;
    
    // Re-apply hide styles to ensure inspector stays hidden
    objectInspector.style.display = 'none';
    objectInspector.style.opacity = '0';
    objectInspector.style.visibility = 'hidden';
    objectInspector.style.pointerEvents = 'none';
    objectInspector.style.position = 'absolute';
    objectInspector.style.left = '-9999px';
    objectInspector.style.top = '-9999px';
    objectInspector.style.zIndex = '-9999';
    
    // Clear auto-update interval
    if (state.inspectorUpdateInterval) {
        clearInterval(state.inspectorUpdateInterval);
        state.inspectorUpdateInterval = null;
    }
    
    // Stop auto-refresh
    stopAutoRefresh();
    
    // Reset chart state
    chartInitialized = false;
    currentObjectId = null;
    
    state.selectedObject = null;
};

// Add mobile-friendly backdrop click to close functionality
const setupInspectorBackdropClick = () => {
    const objectInspector = document.getElementById('objectInspector');
    if (!objectInspector) return;
    
    // Remove existing event listeners to prevent duplicates
    objectInspector.removeEventListener('click', handleInspectorBackdropClick);
    
    // Add backdrop click handler
    objectInspector.addEventListener('click', handleInspectorBackdropClick);
};

const handleInspectorBackdropClick = (e) => {
    // Only close if clicking on the inspector backdrop (not on content)
    if (e.target.id === 'objectInspector') {
        hideObjectInspector();
    }
};

// Dragging functionality for object inspector
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let initialLeft = 0;
let initialTop = 0;

const setupInspectorDragging = () => {
    const objectInspector = document.getElementById('objectInspector');
    const inspectorHeader = objectInspector?.querySelector('.inspector-header');
    
    if (!objectInspector || !inspectorHeader) return;
    
    // Remove existing listeners to prevent duplicates
    inspectorHeader.removeEventListener('mousedown', startDrag);
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', endDrag);
    
    // Add drag listeners
    inspectorHeader.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    
    // Touch support for mobile
    inspectorHeader.removeEventListener('touchstart', startDragTouch);
    document.removeEventListener('touchmove', dragTouch);
    document.removeEventListener('touchend', endDrag);
    
    inspectorHeader.addEventListener('touchstart', startDragTouch, { passive: false }); // passive: false is required because startDragTouch calls preventDefault
    document.addEventListener('touchmove', dragTouch);
    document.addEventListener('touchend', endDrag);
};

// REMOVED: Energy tab setup function

// REMOVED: Energy chart readiness function

// REMOVED: Energy tab event listeners function



// REMOVED: Energy chart update function

// REMOVED: Energy statistics update function

// REMOVED: Energy chart export function

// REMOVED: Energy chart clear function

// ===== ENERGY TAB FUNCTIONALITY =====

// Chart state tracking
let chartInitialized = false;
let currentObjectId = null;
let autoRefreshInterval = null;
let autoRefreshEnabled = true;
const AUTO_REFRESH_INTERVAL = 2000; // 2 seconds

/**
 * Set up the energy tab with chart and controls
 */
const setupEnergyTab = () => {
    const energyTab = document.querySelector('.inspector-tab[data-tab="energy"]');
    const detailsTab = document.querySelector('.inspector-tab[data-tab="details"]');
    const energyTabContent = document.getElementById('energyTab');
    const detailsTabContent = document.getElementById('detailsTab');
    
    if (!energyTab || !detailsTab || !energyTabContent || !detailsTabContent) {
        // Silently return instead of logging error - elements may not exist during initialization
        return;
    }
    
    console.log('Setting up energy tab system');
    
    // Build energy tab HTML structure
    energyTabContent.innerHTML = `
        <div class="energy-chart-container">
            <canvas id="energyChart" width="500" height="300"></canvas>
        </div>
        <div class="energy-controls">
            <button class="ui-button" id="refreshEnergyChart" title="Refresh Chart Data">🔄 Refresh</button>
            <button class="ui-button" id="exportEnergyChart" title="Export as PNG">📊 Export Chart</button>
        </div>
    `;
    
    // Set up tab switching
    energyTab.addEventListener('click', () => {
        console.log('Energy tab clicked');
        energyTab.classList.add('active');
        detailsTab.classList.remove('active');
        energyTabContent.classList.add('active');
        detailsTabContent.classList.remove('active');
        
        // Initialize chart if needed
        ensureChartReady();
        
        // Update chart with current object data
        updateEnergyChart();
        
        // Start auto-refresh for this tab
        startAutoRefresh();
        
        // Force a chart update to ensure it's visible
        setTimeout(() => {
            if (state.selectedObject) {
                console.log('Forcing chart update after tab activation');
                updateEnergyChart();
            }
        }, 50);
    });
    
    detailsTab.addEventListener('click', () => {
        detailsTab.classList.add('active');
        energyTab.classList.remove('active');
        detailsTabContent.classList.add('active');
        energyTabContent.classList.remove('active');
        
        // Stop auto-refresh when switching away from energy tab
        stopAutoRefresh();
    });
    
    // Set up export button
    const exportButton = document.getElementById('exportEnergyChart');
    if (exportButton) {
        exportButton.addEventListener('click', handleExportChart);
    }
    
    // Set up refresh button
    const refreshButton = document.getElementById('refreshEnergyChart');
    if (refreshButton) {
        refreshButton.addEventListener('click', handleRefreshChart);
        console.log('Refresh button event listener attached');
    } else {
        console.warn('Refresh button not found during setup');
    }
    
    console.log('Energy tab setup complete');
    
    // Add a global click handler as a fallback for the refresh button
    // This ensures the refresh button works even if the event listener wasn't properly attached
    document.addEventListener('click', (event) => {
        if (event.target && event.target.id === 'refreshEnergyChart') {
            console.log('Refresh button clicked via global handler');
            handleRefreshChart();
        }
    });
};

/**
 * Ensure chart is initialized and ready
 */
const ensureChartReady = () => {
    const canvas = document.getElementById('energyChart');
    if (!canvas) return;
    
    if (!chartInitialized) {
        console.log('Initializing energy chart');
        const success = initChart(canvas);
        if (success) {
            chartInitialized = true;
            console.log('Energy chart initialized successfully');
        } else {
            console.error('Failed to initialize energy chart');
        }
    }
};

/**
 * Update the energy chart with current object data
 */
const updateEnergyChart = () => {
    console.log('updateEnergyChart called');
    
    if (!state.selectedObject) {
        console.log('No selected object, skipping chart update');
        return;
    }
    
    const objectId = state.selectedObject.object.id;
    console.log('Updating chart for object ID:', objectId);
    
    // Clear chart if switching to a different object
    if (currentObjectId !== null && currentObjectId !== objectId) {
        console.log('Switching objects, clearing chart');
        clearChart();
    }
    
    currentObjectId = objectId;
    
    // Get energy history for the selected object
    const energyHistory = getObjectEnergyHistory(objectId);
    console.log('Energy history length:', energyHistory.length);
    
    if (energyHistory.length === 0) {
        console.log('No energy data available for object:', objectId);
        // Clear chart and show collecting message
        clearChart();
        showCollectingMessage();
        // Start auto-refresh to check for new data
        startAutoRefresh();
        return;
    }
    
    console.log('Updating chart with', energyHistory.length, 'data points for object:', objectId);
    
    // Ensure chart is ready before updating
    ensureChartReady();
    
    // Update the chart
    updateChart(energyHistory);
    hideCollectingMessage();
    
    // Stop auto-refresh since we have data
    stopAutoRefresh();
};

/**
 * Show collecting data message in energy tab
 */
const showCollectingMessage = () => {
    const energyTabContent = document.getElementById('energyTab');
    if (!energyTabContent) return;
    
    // Find or create the collecting message element
    let collectingMessage = energyTabContent.querySelector('.collecting-message');
    if (!collectingMessage) {
        collectingMessage = document.createElement('div');
        collectingMessage.className = 'collecting-message';
        collectingMessage.innerHTML = `
            <div class="collecting-content">
                <div class="collecting-spinner"></div>
                <div class="collecting-text">Collecting data...</div>
            </div>
        `;
        
        // Insert after the chart container
        const chartContainer = energyTabContent.querySelector('.energy-chart-container');
        if (chartContainer) {
            chartContainer.parentNode.insertBefore(collectingMessage, chartContainer.nextSibling);
        } else {
            energyTabContent.appendChild(collectingMessage);
        }
    }
    
    collectingMessage.style.display = 'block';
};

/**
 * Hide collecting data message in energy tab
 */
const hideCollectingMessage = () => {
    const energyTabContent = document.getElementById('energyTab');
    if (!energyTabContent) return;
    
    const collectingMessage = energyTabContent.querySelector('.collecting-message');
    if (collectingMessage) {
        collectingMessage.style.display = 'none';
    }
};

/**
 * Start auto-refresh for energy chart
 */
const startAutoRefresh = () => {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    autoRefreshInterval = setInterval(() => {
        if (autoRefreshEnabled && state.selectedObject) {
            const energyTab = document.querySelector('.inspector-tab[data-tab="energy"]');
            if (energyTab && energyTab.classList.contains('active')) {
                updateEnergyChart();
            }
        }
    }, AUTO_REFRESH_INTERVAL);
    
    // Update refresh button to show auto-refresh is active
    const refreshButton = document.getElementById('refreshEnergyChart');
    if (refreshButton) {
        refreshButton.title = 'Auto-refresh active - Click to refresh now';
        refreshButton.classList.add('auto-refresh-active');
    }
    
    console.log('Auto-refresh started for energy chart');
};

/**
 * Stop auto-refresh for energy chart
 */
const stopAutoRefresh = () => {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        
        // Update refresh button to show auto-refresh is inactive
        const refreshButton = document.getElementById('refreshEnergyChart');
        if (refreshButton) {
            refreshButton.title = 'Refresh Chart Data';
            refreshButton.classList.remove('auto-refresh-active');
        }
        
        console.log('Auto-refresh stopped for energy chart');
    }
};

/**
 * Handle chart refresh
 */
const handleRefreshChart = () => {
    console.log('Manual chart refresh requested');
    
    // Ensure chart is ready before updating
    ensureChartReady();
    
    // Update the chart
    updateEnergyChart();
    
    // Provide visual feedback
    const refreshButton = document.getElementById('refreshEnergyChart');
    if (refreshButton) {
        // Add a brief visual feedback
        refreshButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            refreshButton.style.transform = '';
        }, 150);
    }
};

/**
 * Handle chart export
 */
const handleExportChart = () => {
    const dataUrl = exportChart();
    if (!dataUrl) {
        alert('Chart is not ready yet.');
        return;
    }
    
    try {
        const link = document.createElement('a');
        const objectId = state.selectedObject ? state.selectedObject.object.id : 'unknown';
        link.download = `energy-chart-${objectId}-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        console.log('Energy chart exported successfully');
    } catch (error) {
        console.error('Failed to export energy chart:', error);
        alert('Failed to export chart. Please try again.');
    }
};

// Update cursor based on minimized state
const updateInspectorCursor = () => {
    const objectInspector = document.getElementById('objectInspector');
    const inspectorHeader = objectInspector?.querySelector('.inspector-header');
    
    if (!objectInspector || !inspectorHeader) return;
    
    if (objectInspector.classList.contains('minimized')) {
        inspectorHeader.style.cursor = 'default';
    } else {
        inspectorHeader.style.cursor = 'grab';
    }
};

const startDrag = (e) => {
    e.preventDefault();
    
    const objectInspector = document.getElementById('objectInspector');
    // Don't allow dragging when minimized
    if (objectInspector.classList.contains('minimized')) {
        return;
    }
    
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    
    // Get the current visual position (after any transforms)
    const rect = objectInspector.getBoundingClientRect();
    
    // The inspector starts centered with transform: translate(-50%, -50%)
    // When we start dragging, we need to set the absolute position to match the current visual position
    // The rect.left and rect.top give us the actual visual position on screen
    initialLeft = rect.left;
    initialTop = rect.top;
    
    objectInspector.classList.add('dragging');
    
    // Set the position immediately to prevent jumping
    // We need to set the position BEFORE removing the transform
    objectInspector.style.left = initialLeft + 'px';
    objectInspector.style.top = initialTop + 'px';
    objectInspector.style.transform = 'none';
};

const startDragTouch = (e) => {
    e.preventDefault();
    isDragging = true;
    const touch = e.touches[0];
    dragStartX = touch.clientX;
    dragStartY = touch.clientY;
    
    const objectInspector = document.getElementById('objectInspector');
    // Get the current visual position (after any transforms)
    const rect = objectInspector.getBoundingClientRect();
    
    // The inspector starts centered with transform: translate(-50%, -50%)
    // When we start dragging, we need to set the absolute position to match the current visual position
    // The rect.left and rect.top give us the actual visual position on screen
    initialLeft = rect.left;
    initialTop = rect.top;
    
    objectInspector.classList.add('dragging');
    
    // Set the position immediately to prevent jumping
    // We need to set the position BEFORE removing the transform
    objectInspector.style.left = initialLeft + 'px';
    objectInspector.style.top = initialTop + 'px';
    objectInspector.style.transform = 'none';
};

const drag = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const objectInspector = document.getElementById('objectInspector');
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    
    // Small threshold to prevent accidental drags
    if (Math.abs(deltaX) < 3 && Math.abs(deltaY) < 3) return;
    
    const newLeft = initialLeft + deltaX;
    const newTop = initialTop + deltaY;
    
    // Keep inspector within viewport bounds
    const rect = objectInspector.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width;
    const maxTop = window.innerHeight - rect.height;
    
    const clampedLeft = Math.max(0, Math.min(newLeft, maxLeft));
    const clampedTop = Math.max(0, Math.min(newTop, maxTop));
    
    // Set position and remove transform immediately to prevent jumping
    objectInspector.style.left = clampedLeft + 'px';
    objectInspector.style.top = clampedTop + 'px';
    objectInspector.style.transform = 'none';
};

const dragTouch = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const objectInspector = document.getElementById('objectInspector');
    const deltaX = touch.clientX - dragStartX;
    const deltaY = touch.clientY - dragStartY;
    
    // Small threshold to prevent accidental drags
    if (Math.abs(deltaX) < 3 && Math.abs(deltaY) < 3) return;
    
    const newLeft = initialLeft + deltaX;
    const newTop = initialTop + deltaY;
    
    // Keep inspector within viewport bounds
    const rect = objectInspector.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width;
    const maxTop = window.innerHeight - rect.height;
    
    const clampedLeft = Math.max(0, Math.min(newLeft, maxLeft));
    const clampedTop = Math.max(0, Math.min(newTop, maxTop));
    
    // Set position and remove transform immediately to prevent jumping
    objectInspector.style.left = clampedLeft + 'px';
    objectInspector.style.top = clampedTop + 'px';
    objectInspector.style.transform = 'none';
};

const endDrag = () => {
    isDragging = false;
    const objectInspector = document.getElementById('objectInspector');
    if (objectInspector) {
        objectInspector.classList.remove('dragging');
    }
};



// Overlay minimize/maximize functionality
const setupOverlayMinimize = () => {
    const overlay = document.getElementById('overlay');
    const minimizeBtn = document.getElementById('overlayMinimize');
    
    if (!overlay || !minimizeBtn) return;
    
    // Remove existing listeners to prevent duplicates
    minimizeBtn.removeEventListener('click', toggleOverlayMinimize);
    
    // Add minimize/maximize handler
    minimizeBtn.addEventListener('click', toggleOverlayMinimize);
};

const toggleOverlayMinimize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const overlay = document.getElementById('overlay');
    const minimizeBtn = document.getElementById('overlayMinimize');
    
    if (!overlay || !minimizeBtn) return;
    
    const isMinimized = overlay.classList.contains('minimized');
    
    if (isMinimized) {
        // Maximize
        overlay.classList.remove('minimized');
        minimizeBtn.textContent = '−';
        minimizeBtn.title = 'Minimize';
    } else {
        // Minimize
        overlay.classList.add('minimized');
        minimizeBtn.textContent = '+';
        minimizeBtn.title = 'Maximize';
    }
};
/**
 * Create a mass adjustment slider for the object inspector
 * @param {Object} object - The physics object
 * @param {string} type - The type of object
 * @returns {string} HTML string for the mass slider
 */
const createMassSlider = (object, type) => {
    console.log('Creating mass slider for:', type, object);
    let currentMass, minMass, maxMass, massUnit, massLabel;
    
    switch (type) {
        case 'BlackHole':
            currentMass = object.mass / SOLAR_MASS_UNIT;
            minMass = 0.1;
            maxMass = 1000;
            massUnit = 'M☉';
            massLabel = 'Object Mass';
            break;
        case 'Star':
            currentMass = object.massInSuns || (object.mass / SOLAR_MASS_UNIT);
            minMass = 0.08; // Lower minimum to allow very low mass stars
            maxMass = 100;
            massUnit = 'M☉';
            massLabel = 'Object Mass';
            break;
        case 'NeutronStar':
            currentMass = object.massInSuns || (object.mass / SOLAR_MASS_UNIT);
            minMass = 1.0;
            maxMass = 3.0;
            massUnit = 'M☉';
            massLabel = 'Object Mass';
            break;
        case 'WhiteDwarf':
            currentMass = object.massInSuns || (object.mass / SOLAR_MASS_UNIT);
            minMass = 0.1;
            maxMass = 1.4;
            massUnit = 'M☉';
            massLabel = 'Object Mass';
            break;
        case 'Planet':
            currentMass = object.massInEarths || (object.mass / EARTH_MASS_UNIT);
            minMass = 0.01;
            maxMass = 10;
            massUnit = 'M⊕';
            massLabel = 'Object Mass';
            break;
        case 'GasGiant':
            currentMass = object.massInJupiters || (object.mass / 50.0);
            minMass = 0.1;
            maxMass = 100; // Extended to allow transformation to star (threshold is 80 M♃)
            massUnit = 'M♃';
            massLabel = 'Object Mass';
            break;
        case 'Asteroid':
            currentMass = object.mass / EARTH_MASS_UNIT;
            minMass = 0.0001;
            maxMass = 0.1;
            massUnit = 'M⊕';
            massLabel = 'Object Mass';
            break;
        case 'Comet':
            currentMass = object.massInComets || (object.mass / 0.1);
            minMass = 0.001;
            maxMass = 1.0;
            massUnit = 'C';
            massLabel = 'Object Mass';
            break;
        default:
            return '';
    }
    
    return `
        <div class="mass-adjustment-section">
            <div class="mass-slider-container">
                <label class="mass-slider-label">${massLabel}</label>
                <div class="mass-slider-control">
                    <input type="range" 
                           id="massSlider" 
                           data-object-id="${object.id || 'unknown'}"
                           min="${minMass}" 
                           max="${maxMass}" 
                           step="${(maxMass - minMass) / 100}" 
                           value="${currentMass}"
                           class="mass-slider">
                    <span class="mass-value-display" id="massValueDisplay">${currentMass.toFixed(3)} ${massUnit}</span>
                </div>
            </div>
        </div>
    `;
};

/**
 * Set up event listeners for the mass slider
 */
const setupMassSliderListeners = () => {
    const massSlider = document.getElementById('massSlider');
    const massValueDisplay = document.getElementById('massValueDisplay');
    
    if (!massSlider || !massValueDisplay) {
        return;
    }
    
    // Flag to track if slider is being dragged
    let isDragging = false;
    
    const updateMass = () => {
        const newMass = parseFloat(massSlider.value);
        const object = state.selectedObject.object;
        const type = state.selectedObject.type;
        
        // Skip mass update if we're in the middle of a transformation
        if (state.isTransforming) {
            return;
        }
        
        // Update the object's mass and check for transformation
        const newType = updateObjectMass(object, type, newMass);
        
        // Clear the energy chart since mass change invalidates energy history
        // This ensures the chart shows fresh data with the new mass
        if (chartInitialized) {
            console.log('Clearing energy chart due to mass change');
            clearChart();
            showCollectingMessage();
        }
        
        // If object type changed, refresh the entire inspector and stop processing
        if (newType && newType !== type) {
            console.log(`Object transformed from ${type} to ${newType}!`);
            
            // Set transformation flag to prevent mass updates during the process
            state.isTransforming = true;
            
            // Update the selected object type
            state.selectedObject.type = newType;
            
            // Reset the slider value to prevent immediate further transformation
            // For gas giant to star transformation, set slider to the star's actual mass
            if (type === 'GasGiant' && newType === 'Star') {
                // Use the new star object, not the old gas giant object
                const starObject = state.selectedObject.object;
                const massInSolarMasses = starObject.massInSuns || (starObject.mass / SOLAR_MASS_UNIT);
                // Temporarily set the slider value to the correct star mass
                setTimeout(() => {
                    const newSlider = document.getElementById('massSlider');
                    if (newSlider) {
                        newSlider.value = massInSolarMasses;
                        const massValueDisplay = document.getElementById('massValueDisplay');
                        if (massValueDisplay) {
                            massValueDisplay.textContent = `${massInSolarMasses.toFixed(3)} M☉`;
                        }
                    }
                }, 100);
            }
            
            // Refresh the inspector with new object type
            const inspectorContent = document.getElementById('inspectorContent');
            if (inspectorContent) {
                // Create new mass slider for the new object type
                const massSlider = createMassSlider(state.selectedObject.object, newType);
                let content = massSlider + '<div class="stat-separator"></div>';
                
                // Get info for the new object type
                let info;
                switch (newType) {
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
                        return;
                }
                
                // Add stats and description
                info.stats.forEach(stat => {
                    content += `
                        <div class="stat-row">
                            <span class="stat-label">${stat.label}:</span>
                            <span class="stat-value">${stat.value}</span>
                        </div>
                    `;
                });
                
                content += `<div class="object-description">${info.description}</div>`;
                
                // Only update the details tab content, not the entire inspector content
                const detailsTabContent = document.getElementById('detailsTab');
                if (detailsTabContent) {
                    detailsTabContent.innerHTML = content;
                }
                
                // Set up new mass slider listeners
                setupMassSliderListeners();
                
                // Energy tab should still be intact since we only updated details tab
                // Just ensure chart is ready for the new object
                if (chartInitialized) {
                    console.log('Ensuring chart is ready for transformed object');
                    ensureChartReady();
                    updateEnergyChart();
                }
                
                // Show transformation notification
                showTransformationNotification(type, newType);
                
                // Clear transformation flag after everything is set up
                setTimeout(() => {
                    state.isTransforming = false;
                }, 200);
            }
            return; // Stop processing after transformation
        } else {
            // No transformation, just update the display
            let massUnit;
            switch (type) {
                case 'BlackHole':
                case 'Star':
                case 'NeutronStar':
                case 'WhiteDwarf':
                    massUnit = 'M☉';
                    break;
                case 'Planet':
                case 'Asteroid':
                    massUnit = 'M⊕';
                    break;
                case 'GasGiant':
                    massUnit = 'M♃';
                    break;
                case 'Comet':
                    massUnit = 'C';
                    break;
            }
            
            massValueDisplay.textContent = `${newMass.toFixed(3)} ${massUnit}`;
            
            // Update the stats display to reflect the new mass
            const inspectorContent = document.getElementById('inspectorContent');
            if (inspectorContent && state.selectedObject) {
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
                        return;
                }
                
                // Update only the stats rows, preserve the mass slider
                const statRows = inspectorContent.querySelectorAll('.stat-row');
                const description = inspectorContent.querySelector('.object-description');
                
                // Update stats
                info.stats.forEach((stat, index) => {
                    if (statRows[index]) {
                        statRows[index].innerHTML = `
                            <span class="stat-label">${stat.label}:</span>
                            <span class="stat-value">${stat.value}</span>
                        `;
                    }
                });
                
                // Update description
                if (description) {
                    description.innerHTML = info.description;
                }
            }
        }
    };
    
    // Update on slider change
    massSlider.addEventListener('input', updateMass);
    massSlider.addEventListener('change', updateMass);
    
    // Prevent inspector updates while dragging
    massSlider.addEventListener('mousedown', () => {
        isDragging = true;
        state.sliderDragging = true; // Global flag for inspector updates
    });
    
    massSlider.addEventListener('mouseup', () => {
        isDragging = false;
        state.sliderDragging = false;
    });
    
    massSlider.addEventListener('mouseleave', () => {
        if (isDragging) {
            isDragging = false;
            state.sliderDragging = false;
        }
    });
};

/**
 * Update an object's mass and recalculate related properties
 * @param {Object} object - The physics object to update
 * @param {string} type - The type of object
 * @param {number} newMass - The new mass value
 * @returns {string|null} The new object type if transformation occurred, null otherwise
 */
const updateObjectMass = (object, type, newMass) => {
    let newType = null;
    
    // Clear energy history when mass changes to prevent invalid data
    // Energy calculations depend on mass, so old energy data becomes invalid
    if (object && object.id) {
        console.log(`Clearing energy history for object ${object.id} due to mass change`);
        clearObjectEnergyHistory(object.id);
    }
    
    switch (type) {
        case 'BlackHole':
            object.mass = newMass * SOLAR_MASS_UNIT;
            object.updateRadius(); // Update Schwarzschild radius
            break;
        case 'Star':
            console.log(`DEBUG: Star mass update: newMass = ${newMass} solar masses`);
            object.mass = newMass * SOLAR_MASS_UNIT;
            object.massInSuns = newMass;
            console.log(`DEBUG: Star mass updated: mass = ${object.mass} units, massInSuns = ${object.massInSuns}`);
            // Recalculate star properties based on mass
            object.radius = Math.pow(newMass, 0.8) * STAR_OBJ_RADIUS;
            object.temperature = 3000 + (newMass - 0.2) * 4000;
            object.luminosity = Math.pow(newMass, 3.5);
            
            // Check if star should become a black hole (mass > 20 M☉)
            if (newMass > 20.0) {
                console.log(`DEBUG: Star mass ${newMass} exceeds black hole threshold 20.0 - transforming to black hole`);
                newType = 'BlackHole';
                // Transform star to black hole
                transformStarToBlackHole(object);
            }
            break;
        case 'NeutronStar':
            object.mass = newMass * SOLAR_MASS_UNIT;
            object.massInSuns = newMass;
            // Neutron stars have relatively constant radius
            object.radius = NEUTRON_STAR_RADIUS;
            
            // Check if neutron star should become a black hole (mass > 3 M☉)
            if (newMass > 3.0) {
                newType = 'BlackHole';
                // Transform neutron star to black hole
                transformNeutronStarToBlackHole(object);
            }
            break;
        case 'WhiteDwarf':
            object.mass = newMass * SOLAR_MASS_UNIT;
            object.massInSuns = newMass;
            // White dwarf radius decreases with mass (inverse relationship)
            object.radius = Math.max(WHITE_DWARF_RADIUS * Math.pow(newMass, -0.33), 2);
            
            // Check if white dwarf should become a neutron star (mass > 1.4 M☉ - Chandrasekhar limit)
            if (newMass > 1.4) {
                newType = 'NeutronStar';
                // Transform white dwarf to neutron star
                transformWhiteDwarfToNeutronStar(object);
            }
            break;
        case 'Planet':
            object.mass = newMass * EARTH_MASS_UNIT;
            object.massInEarths = newMass;
            // Recalculate planet radius based on mass
            object.radius = Math.pow(newMass, 0.3) * PLANET_RADIUS;
            object.calculateDensity();
            
            // Check if planet should become a gas giant (mass > 10 M⊕)
            if (newMass > 10.0) {
                newType = 'GasGiant';
                // Transform planet to gas giant
                transformPlanetToGasGiant(object);
            }
            break;
        case 'GasGiant':
            object.mass = newMass * 50.0; // Convert Jupiter masses to simulation units
            object.massInJupiters = newMass;
            object.massInEarths = newMass * 317.8;
            // Recalculate gas giant radius and type
            object.radius = Math.pow(newMass, 0.2) * GAS_GIANT_RADIUS;
            object.calculateGiantType();
            
            // Check if gas giant should become a star (mass > 80 M♃)
            if (newMass > 80.0) {
                newType = 'Star';
                // Transform gas giant to star
                transformGasGiantToStar(object);
            }
            break;
        case 'Asteroid':
            object.mass = newMass * EARTH_MASS_UNIT;
            // Asteroid radius scales with mass
            object.radius = Math.pow(newMass * 1000, 0.33) * ASTEROID_RADIUS;
            
            // Check if asteroid should become a planet (mass > 0.1 M⊕)
            if (newMass > 0.1) {
                newType = 'Planet';
                // Transform asteroid to planet
                transformAsteroidToPlanet(object);
            }
            break;
        case 'Comet':
            object.mass = newMass * 0.1; // Convert comet units to simulation units
            object.massInComets = newMass;
            // Comet radius scales with mass
            object.radius = Math.pow(newMass * 10, 0.33) * 2;
            
            // Check if comet should become an asteroid (mass > 1.0 C)
            if (newMass > 1.0) {
                newType = 'Asteroid';
                // Transform comet to asteroid
                transformCometToAsteroid(object);
            }
            break;
    }
    
    return newType;
};

/**
 * Transform a star into a black hole
 * @param {Object} object - The star object to transform
 */
const transformStarToBlackHole = (object) => {
    console.log('Star transforming into black hole!');
    // Preserve position and velocity
    const pos = { x: object.pos.x, y: object.pos.y };
    const vel = { x: object.vel.x, y: object.vel.y };
    const mass = object.mass;
    
    // Clear energy history for the old object before transformation
    if (object && object.id) {
        console.log(`Clearing energy history for transforming star ${object.id}`);
        clearObjectEnergyHistory(object.id);
    }
    
    // Create new black hole
    const blackHole = new BlackHole(pos, mass, vel);
    blackHole.name = object.name || 'Transformed Black Hole';
    
    // Replace the star in the stars array
    const starIndex = stars.indexOf(object);
    if (starIndex !== -1) {
        stars.splice(starIndex, 1);
        bh_list.push(blackHole);
        
        // Update the selected object reference
        if (state.selectedObject && state.selectedObject.object === object) {
            state.selectedObject.object = blackHole;
            state.selectedObject.type = 'BlackHole';
        }
    }
};

/**
 * Transform a neutron star into a black hole
 * @param {Object} object - The neutron star object to transform
 */
const transformNeutronStarToBlackHole = (object) => {
    console.log('Neutron star transforming into black hole!');
    const pos = { x: object.pos.x, y: object.pos.y };
    const vel = { x: object.vel.x, y: object.vel.y };
    const mass = object.mass;
    
    // Clear energy history for the old object before transformation
    if (object && object.id) {
        console.log(`Clearing energy history for transforming neutron star ${object.id}`);
        clearObjectEnergyHistory(object.id);
    }
    
    const blackHole = new BlackHole(pos, mass, vel);
    blackHole.name = object.name || 'Transformed Black Hole';
    
    const nsIndex = neutron_stars.indexOf(object);
    if (nsIndex !== -1) {
        neutron_stars.splice(nsIndex, 1);
        bh_list.push(blackHole);
        
        if (state.selectedObject && state.selectedObject.object === object) {
            state.selectedObject.object = blackHole;
            state.selectedObject.type = 'BlackHole';
        }
    }
};

/**
 * Transform a white dwarf into a neutron star
 * @param {Object} object - The white dwarf object to transform
 */
const transformWhiteDwarfToNeutronStar = (object) => {
    console.log('White dwarf transforming into neutron star!');
    const pos = { x: object.pos.x, y: object.pos.y };
    const vel = { x: object.vel.x, y: object.vel.y };
    const mass = object.mass;
    
    // Clear energy history for the old object before transformation
    if (object && object.id) {
        console.log(`Clearing energy history for transforming white dwarf ${object.id}`);
        clearObjectEnergyHistory(object.id);
    }
    
    const neutronStar = new NeutronStar(pos, vel, mass / SOLAR_MASS_UNIT);
    neutronStar.name = object.name || 'Transformed Neutron Star';
    
    const wdIndex = white_dwarfs.indexOf(object);
    if (wdIndex !== -1) {
        white_dwarfs.splice(wdIndex, 1);
        neutron_stars.push(neutronStar);
        
        if (state.selectedObject && state.selectedObject.object === object) {
            state.selectedObject.object = neutronStar;
            state.selectedObject.type = 'NeutronStar';
        }
    }
};

/**
 * Transform a planet into a gas giant
 * @param {Object} object - The planet object to transform
 */
const transformPlanetToGasGiant = (object) => {
    console.log('Planet transforming into gas giant!');
    const pos = { x: object.pos.x, y: object.pos.y };
    const vel = { x: object.vel.x, y: object.vel.y };
    const mass = object.mass / 50.0; // Convert to Jupiter masses
    
    // Clear energy history for the old object before transformation
    if (object && object.id) {
        console.log(`Clearing energy history for transforming planet ${object.id}`);
        clearObjectEnergyHistory(object.id);
    }
    
    const gasGiant = new GasGiant(pos, vel, mass);
    gasGiant.name = object.name || 'Transformed Gas Giant';
    
    const planetIndex = planets.indexOf(object);
    if (planetIndex !== -1) {
        planets.splice(planetIndex, 1);
        gas_giants.push(gasGiant);
        
        if (state.selectedObject && state.selectedObject.object === object) {
            state.selectedObject.object = gasGiant;
            state.selectedObject.type = 'GasGiant';
        }
    }
};

/**
 * Transform a gas giant into a star
 * @param {Object} object - The gas giant object to transform
 */
const transformGasGiantToStar = (object) => {
    console.log('Gas giant transforming into star!');
    const pos = { x: object.pos.x, y: object.pos.y };
    const vel = { x: object.vel.x, y: object.vel.y };
    
    // Clear energy history for the old object before transformation
    if (object && object.id) {
        console.log(`Clearing energy history for transforming gas giant ${object.id}`);
        clearObjectEnergyHistory(object.id);
    }
    
    // Convert Jupiter masses to solar masses
    // The simulation uses 50 units = 1 Jupiter mass, but we need to convert to real solar masses
    // 1 Jupiter mass = 1/1047 solar masses (correct conversion)
    const massInJupiters = object.massInJupiters || (object.mass / 50.0);
    const massInSolarMasses = massInJupiters / 1047.0;
    
    // Create star with the converted mass in simulation units
    const star = new StarObject(pos, vel, massInSolarMasses);
    star.name = object.name || 'Transformed Star';
    
    // Ensure the star has the correct mass properties
    star.massInSuns = massInSolarMasses;
    star.mass = massInSolarMasses * SOLAR_MASS_UNIT;
    
    const ggIndex = gas_giants.indexOf(object);
    if (ggIndex !== -1) {
        gas_giants.splice(ggIndex, 1);
        stars.push(star);
        
        if (state.selectedObject && state.selectedObject.object === object) {
            state.selectedObject.object = star;
            state.selectedObject.type = 'Star';
        }
    }
};

/**
 * Transform an asteroid into a planet
 * @param {Object} object - The asteroid object to transform
 */
const transformAsteroidToPlanet = (object) => {
    console.log('Asteroid transforming into planet!');
    const pos = { x: object.pos.x, y: object.pos.y };
    const vel = { x: object.vel.x, y: object.vel.y };
    const mass = object.mass / EARTH_MASS_UNIT;
    
    // Clear energy history for the old object before transformation
    if (object && object.id) {
        console.log(`Clearing energy history for transforming asteroid ${object.id}`);
        clearObjectEnergyHistory(object.id);
    }
    
    const planet = new Planet(pos, vel, mass);
    planet.name = object.name || 'Transformed Planet';
    
    const asteroidIndex = asteroids.indexOf(object);
    if (asteroidIndex !== -1) {
        asteroids.splice(asteroidIndex, 1);
        planets.push(planet);
        
        if (state.selectedObject && state.selectedObject.object === object) {
            state.selectedObject.object = planet;
            state.selectedObject.type = 'Planet';
        }
    }
};

/**
 * Transform a comet into an asteroid
 * @param {Object} object - The comet object to transform
 */
const transformCometToAsteroid = (object) => {
    console.log('Comet transforming into asteroid!');
    const pos = { x: object.pos.x, y: object.pos.y };
    const vel = { x: object.vel.x, y: object.vel.y };
    
    // Clear energy history for the old object before transformation
    if (object && object.id) {
        console.log(`Clearing energy history for transforming comet ${object.id}`);
        clearObjectEnergyHistory(object.id);
    }
    
    const asteroid = new Asteroid(pos, vel);
    asteroid.name = object.name || 'Transformed Asteroid';
    asteroid.mass = object.mass;
    
    const cometIndex = comets.indexOf(object);
    if (cometIndex !== -1) {
        comets.splice(cometIndex, 1);
        asteroids.push(asteroid);
        
        if (state.selectedObject && state.selectedObject.object === object) {
            state.selectedObject.object = asteroid;
            state.selectedObject.type = 'Asteroid';
        }
    }
};
/**
 * Show a notification when an object transforms
 * @param {string} oldType - The previous object type
 * @param {string} newType - The new object type
 */
const showTransformationNotification = (oldType, newType) => {
    // Clear energy chart when object transforms
    if (chartInitialized) {
        console.log('Clearing energy chart due to object transformation');
        clearChart();
        showCollectingMessage();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'transformation-notification';
    notification.innerHTML = `
        <div class="transformation-content">
            <span class="transformation-icon">✨</span>
            <span class="transformation-text">${oldType} → ${newType}</span>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('visible');
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('visible');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, 3000);
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

// Enhanced scenario info box function
const show_enhanced_scenario_info = (scenarioName) => {
  if (!scenarioName || !SCENARIO_INFO[scenarioName]) {
    return;
  }
  
  const info = SCENARIO_INFO[scenarioName];
  const infoBox = document.getElementById('scenarioInfoBox');
  const title = document.getElementById('scenarioInfoTitle');
  const summary = document.getElementById('scenarioInfoSummary');
  const features = document.getElementById('scenarioInfoFeatures');
  
  // Set the title and summary
  title.textContent = info.title;
  summary.textContent = info.summary;
  
  // Clear the features list since we're removing the key highlights section
  features.innerHTML = '';
  
  // Check if splash screen is still active
  const splash = document.getElementById('splash');
  const isSplashActive = splash && !splash.classList.contains('hidden') && splash.style.display !== 'none';
  
  if (isSplashActive) {
    // If splash is still active, wait for it to end before showing info box
    const checkSplashEnd = () => {
      const currentSplash = document.getElementById('splash');
      if (!currentSplash || currentSplash.classList.contains('hidden') || currentSplash.style.display === 'none') {
        // Splash has ended, show the info box
        infoBox.classList.add('showUI');
        // Auto-hide after 18 seconds
        setTimeout(() => {
          infoBox.classList.remove('showUI');
        }, 18000);
      } else {
        // Splash still active, check again in 100ms
        setTimeout(checkSplashEnd, 100);
      }
    };
    checkSplashEnd();
  } else {
    // Splash has ended, show the info box immediately
    infoBox.classList.add('showUI');
    // Auto-hide after 18 seconds
    setTimeout(() => {
      infoBox.classList.remove('showUI');
    }, 18000);
  }
};

/**
 * Apply preset scenario settings to the simulation
 * @param {Object} settings_dict - Settings object to modify with preset values
 */
const apply_preset = () => {
  const ps = SETTINGS.preset_scenario;
  if (ps === 'None') return;
  const fresh_defaults = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  Object.assign(SETTINGS, fresh_defaults, { preset_scenario: ps });

  if (ps === 'Binary BH') {
    Object.assign(SETTINGS, {
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
      show_bh_jets: true,
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
      preset_zoom: 1.5,
    });
  } else if (ps === 'Neutron Star Collision') {
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_neutron_stars: 2,
      use_individual_ns_masses: true,
      ns_masses: [1.4, 1.4], // Both neutron stars are 1.4 M☉ as per GW170817
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
      preset_zoom: 1.5,
    });
  } else if (ps === 'Pulsar System') {
    Object.assign(SETTINGS, {
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
      preset_zoom: 1.5,
    });
  } else if (ps === 'White Dwarf Binary') {
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_white_dwarfs: 2,
      num_planets: 0,
      num_gas_giants: 0,
      num_asteroids: 80, // Increased for debris disk effect
      placement: 'Circular',
      init_velocity: 25,
      mutual_gravity: true,
      gravitational_constant: 1.4,
      sim_speed: 0.8,
      enable_star_merging: true,
      show_trails: true,
      trail_length: 40,
      show_accretion_disk: true, // Show accretion between white dwarfs
      preset_zoom: 1.5,
    });
  } else if (ps === 'Stellar Graveyard') {
    Object.assign(SETTINGS, {
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
      preset_zoom: 1.5,
    });
  } else if (ps === 'Galactic Center') {
    Object.assign(SETTINGS, {
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
      gravitational_constant: 1.8,
      sim_speed: 0.6,
      enable_star_merging: true,
      preset_zoom: 1.5,
    });
  } else if (ps === 'Supernova Remnant') {
    Object.assign(SETTINGS, {
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
      preset_zoom: 1.5,
    });
  } else if (ps === 'Compact Object Zoo') {
    Object.assign(SETTINGS, {
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
      preset_zoom: 1.5,
    });
  } else if (ps === 'Millisecond Pulsar') {
    Object.assign(SETTINGS, {
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
      preset_zoom: 1.5,
    });
  } else if (ps === 'Tidal Disruption Event') {
    Object.assign(SETTINGS, {
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
      sim_speed: 0.7,
      gravitational_constant: 2.0,
      preset_zoom: 1.5,
    });
  } else if (ps === 'Intermediate Mass BH') {
    Object.assign(SETTINGS, {
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
      preset_zoom: 1.5,
    });
  } else if (ps === 'Galactic Collision') {
    Object.assign(SETTINGS, {
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
      gravitational_constant: 1.9,
      enable_star_merging: true,
      preset_zoom: 1.5,
    });
  } else if (ps === 'Micro BH Swarm') {
    Object.assign(SETTINGS, {
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
      preset_zoom: 1.5,
    });
  } else if (ps === 'Exoplanet Lab') {
    Object.assign(SETTINGS, {
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
      preset_zoom: 1.5,
    });
  } else if (ps === 'Triple BH System') {
    Object.assign(SETTINGS, {
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
      preset_zoom: 1.5,
    });
  } else if (ps === 'Supermassive BH') {
    Object.assign(SETTINGS, {
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
      preset_zoom: 1.5,
    });
  } else if (ps === 'Star Cluster') {
    Object.assign(SETTINGS, {
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
      preset_zoom: 1.5,
    });
  } else if (ps === 'Kuiper Belt') {
    Object.assign(SETTINGS, {
      placement: 'Empty',
      mutual_gravity: true,
      num_black_holes: 0,
      num_stars: 1, // Central star for Kuiper Belt objects
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
      preset_zoom: 1.5,
    });
  } else if (ps === 'Sagittarius A*') {
    Object.assign(SETTINGS, {
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
      sim_speed: 0.5, // Slower to see the extreme dynamics
      gravitational_constant: 2.0,
      enable_star_merging: true,
      preset_zoom: 1.5,
    });
  } else if (ps === 'Binary Star System') {
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_stars: 2, // Add 2 stars for binary system
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
      preset_zoom: 1.5,
    });
  } else if (ps === 'Solar System') {
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_stars: 1, // One sun-like star
      mutual_gravity: true,
      placement: 'Empty',
      num_planets: 8, // 8 planets like our solar system
      num_gas_giants: 0, // Gas giants are included in planets
      num_asteroids: 50, // Asteroid belt
      num_comets: 10, // Comets
      init_velocity: 15,
      velocity_stddev: 3,
      gravitational_constant: 1.0,
      sim_speed: 0.5, // Slower for better observation
      enable_star_merging: true,
      show_trails: true,
      trail_length: 20,
      sim_size: 'Small', // Focused view
      preset_zoom: 1.5,
    });
  } else if (ps === 'Earth-Moon System') {
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_stars: 0, // No central star, just Earth-Moon
      num_planets: 1, // Earth
      num_gas_giants: 0,
      num_asteroids: 0,
      num_comets: 0,
      placement: 'Empty', // Special placement handled in initialization
      init_velocity: 10,
      velocity_stddev: 2,
      gravitational_constant: 1.0,
      sim_speed: 0.3, // Very slow for detailed observation
      enable_star_merging: false,
      show_trails: true,
      trail_length: 30,
      sim_size: 'Small', // Focused view
      preset_zoom: 1.5,
    });
  } else if (ps === 'Slingshot') {
    Object.assign(SETTINGS, {
      placement: 'Random',
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
      enable_star_merging: false, // Disable merging to prevent immediate black hole merger
      preset_zoom: 1.5,
    });
  } else if (ps === 'Rogue Encounter') {
    Object.assign(SETTINGS, {
      placement: 'Empty',
      num_black_holes: 1,
      num_stars: 1, // Central star system
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
      preset_zoom: 1.5,
    });
  } else if (ps === 'Quasar Cannon') {
    Object.assign(SETTINGS, {
      num_black_holes: 1,
      bh_mass: 1e9,
      num_stars: 50,
      placement: 'Random',
      sim_size: 'Huge',
      init_velocity: 120,
      velocity_stddev: 40,
      show_accretion_disk: true,
      show_bh_glow: true,
      show_bh_jets: true,
      star_density: 10000,
      sim_speed: 0.7,
      show_trails: true,
      trail_length: 60,
      enable_star_merging: true,
      // Visual: high accretion rate (handled in rendering)
      preset_zoom: 0.05,
    });
  } else if (ps === 'The Pinwheel Galaxy Core') {
    Object.assign(SETTINGS, {
      num_black_holes: 2,
      use_individual_bh_masses: true,
      bh_masses: [1e5, 1e5],
      num_stars: 200,
      placement: 'Circular',
      sim_size: 'Huge',
      init_velocity: 90,
      velocity_stddev: 10,
      show_accretion_disk: true,
      show_bh_glow: true,
      sim_speed: 0.8,
      show_trails: true,
      trail_length: 80,
      enable_star_merging: true,
      // Visual: all stars co-rotating (handled in initialization)
      preset_zoom: 1.5,
    });
  } else if (ps === 'Star Frisbee') {
    Object.assign(SETTINGS, {
      num_black_holes: 1,
      bh_mass: 10,
      num_stars: 30,
      placement: 'Circular',
      sim_size: 'Large',
      init_velocity: 8,
      velocity_stddev: 2,
      show_accretion_disk: false,
      show_bh_glow: true,
      sim_speed: 1.0,
      show_trails: true,
      trail_length: 30,
      enable_star_merging: true,
      // Special: BH moves at 500 km/s (handled in initialization)
      preset_zoom: 1.5,
    });
  } else if (ps === 'Kessler Cascade') {
    Object.assign(SETTINGS, {
      num_black_holes: 1,
      bh_mass: 5,
      num_stars: 0,
      num_planets: 0,
      num_gas_giants: 0,
      num_neutron_stars: 0,
      num_white_dwarfs: 0,
      num_asteroids: 0,
      num_comets: 0,
      sim_size: 'Large',
      placement: 'Random',
      sim_speed: 1.2,
      show_trails: true,
      trail_length: 20,
      enable_star_merging: true,
      // 300 micro-stars as 0.1 Msun stars (handled in initialization)
      preset_zoom: 1.5,
    });
    SETTINGS.num_micro_stars = 300;
    SETTINGS.micro_star_mass = 0.1;
    SETTINGS.micro_star_high_velocity = true;
  } else if (ps === 'Alien Dyson Swarm Collapse') {
    Object.assign(SETTINGS, {
      num_black_holes: 1,
      bh_mass: 1,
      num_stars: 100,
      placement: 'Circular',
      sim_size: 'Medium',
      init_velocity: 30,
      velocity_stddev: 2,
      show_accretion_disk: false,
      show_bh_glow: true,
      sim_speed: 0.9,
      show_trails: true,
      trail_length: 18,
      enable_star_merging: false,
      // Visual: satellites, slight orbital decay (handled in initialization)
      preset_zoom: 1.5,
    });
    SETTINGS.satellites_are_dyson = true;
  } else if (ps === 'Tidal Arm Tango') {
    Object.assign(SETTINGS, {
      num_black_holes: 2,
      use_individual_bh_masses: true,
      bh_masses: [1e6, 1e6],
      num_stars: 300,
      placement: 'Multi-Ring',
      sim_size: 'Huge',
      init_velocity: 100,
      velocity_stddev: 30,
      show_accretion_disk: true,
      show_bh_glow: true,
      sim_speed: 0.7,
      show_trails: true,
      trail_length: 100,
      enable_star_merging: true,
      preset_zoom: 0.3,
    });
    // Place two supermassive black holes on a near-parabolic flyby
    if (bh_list.length >= 2) {
      const sep = 700;
      bh_list[0].pos.x = -sep;
      bh_list[0].pos.y = 0;
      bh_list[1].pos.x = sep;
      bh_list[1].pos.y = 0;
      const v = 120;
      bh_list[0].vel.x = 0;
      bh_list[0].vel.y = v;
      bh_list[1].vel.x = 0;
      bh_list[1].vel.y = -v;
      // Set jet orientations: up and down
      bh_list[0].jet_orientation = Math.PI / 2; // up
      bh_list[1].jet_orientation = -Math.PI / 2; // down
    }
    state.zoom = 0.3;
  } else if (ps === 'Hungry Hungry Holes') {
    Object.assign(SETTINGS, {
      num_black_holes: 4,
      use_individual_bh_masses: true,
      bh_masses: [50, 50, 50, 50],
      num_stars: 50,
      placement: 'Random',
      sim_size: 'Large',
      init_velocity: 20,
      velocity_stddev: 10,
      show_accretion_disk: false,
      show_bh_glow: true,
      sim_speed: 0.8,
      show_trails: true,
      trail_length: 40,
      enable_star_merging: true,
      // Special: BHs at square corners, stars in center (handled in initialization)
      preset_zoom: 1.5,
    });
  } else if (ps === 'Slingshot Gauntlet') {
    Object.assign(SETTINGS, {
      num_black_holes: 5,
      use_individual_bh_masses: true,
      bh_masses: [30, 30, 30, 30, 30],
      num_stars: 1,
      placement: 'Grid',
      sim_size: 'Large',
      init_velocity: 0,
      velocity_stddev: 0,
      show_accretion_disk: false,
      show_bh_glow: true,
      sim_speed: 1.1,
      show_trails: true,
      trail_length: 25,
      enable_star_merging: false,
      // Special: test star shot at 1000 km/s (handled in initialization)
      preset_zoom: 1.5,
    });
    SETTINGS.test_star_slingshot = true;
  } else if (ps === 'Black Hole Billiards') {
    Object.assign(SETTINGS, {
      num_black_holes: 4,
      use_individual_bh_masses: true,
      bh_masses: [1e6, 10, 10, 10],
      num_stars: 20,
      placement: 'Random',
      sim_size: 'Large',
      init_velocity: 30,
      velocity_stddev: 10,
      show_accretion_disk: true,
      show_bh_glow: true,
      sim_speed: 0.9,
      show_trails: true,
      trail_length: 35,
      enable_star_merging: true,
      // Special: 3 small BHs orbiting a supermassive one (handled in initialization)
      preset_zoom: 1.5,
    });
  } else if (ps === 'Stellar Nursery') {
    Object.assign(SETTINGS, {
      num_black_holes: 1,
      bh_mass: 1,
      num_stars: 100,
      placement: 'Random',
      sim_size: 'Medium',
      init_velocity: 10,
      velocity_stddev: 5,
      show_accretion_disk: false,
      show_bh_glow: true,
      sim_speed: 0.8,
      show_trails: true,
      trail_length: 20,
      enable_star_merging: true,
      // Special: BH grows in mass over time (handled in simulation loop)
      preset_zoom: 1.5,
    });
  } else if (ps === 'TRAPPIST-1 System') {
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_stars: 1,
      mutual_gravity: true,
      placement: 'Empty',
      num_planets: 7,
      num_gas_giants: 0,
      num_asteroids: 0,
      num_comets: 0,
      init_velocity: 7,
      velocity_stddev: 0.5,
      gravitational_constant: 1.0,
      sim_speed: 0.7,
      enable_star_merging: false,
      show_trails: true,
      trail_length: 25,
      sim_size: 'Small',
      preset_zoom: 8.0,
    });
  } else if (ps === 'GW150914') {
    Object.assign(SETTINGS, {
      num_black_holes: 2,
      bh_behavior: 'Orbiting',
      use_individual_bh_masses: true,
      bh_masses: [36, 29],
      num_planets: 0,
      num_gas_giants: 0,
      num_stars: 0,
      num_asteroids: 0,
      num_comets: 0,
      num_neutron_stars: 0,
      num_white_dwarfs: 0,
      placement: 'Circular',
      mutual_gravity: false,
      orbit_decay_rate: 0.0025, // Strong inspiral for dramatic GW effect
      show_trails: true,
      sim_speed: 1.0,
      show_velocity_vectors: false,
      interactive_add: true,
      trail_length: 20,
      trail_style: 'Glow',
      sim_size: 'Large',
      star_density: 10000,
      input_object_type: 'BlackHole',
      show_bh_glow: true,
      show_accretion_disk: false,
      show_bh_jets: false,
      show_dynamic_overlays: true,
      enable_asteroids: false,
      dynamic_object_properties: true,
      record_simulation: false,
      show_ambient_lighting: true,
      planet_base_color: '#6495ed',
      star_base_color: '#ffff00',
      enable_star_merging: false,
      max_star_mass_before_bh: 20.0,
      preset_zoom: 1.7,
    });
  }

  SETTINGS.preset_scenario = 'None';
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
    ...comets,
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
      case 'Slingshot':
        if (bh_list.length >= 2) {
          // Create a binary black hole system with proper orbital parameters
          const separation = 100; // Initial separation distance
          const m1 = bh_list[0].mass; // Mass of first black hole (60 M☉)
          const m2 = bh_list[1].mass; // Mass of second black hole (3 M☉)
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
          const G = SETTINGS.gravitational_constant;
          const orbitalSpeed = Math.sqrt(G * totalMass / separation);
          
          // Apply velocities for circular orbit (perpendicular to separation)
          bh_list[0].vel.x = 0;
          bh_list[0].vel.y = orbitalSpeed * (m2 / totalMass); // Reduced velocity based on mass ratio
          bh_list[1].vel.x = 0;
          bh_list[1].vel.y = -orbitalSpeed * (m1 / totalMass); // Opposite direction
          
          // Add slight perturbation to make it more interesting
          const perturbation = 0.9; // Reduce velocity slightly to create more dynamic orbits
          bh_list[0].vel.y *= perturbation;
          bh_list[1].vel.y *= perturbation;
        }
        break;

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
  apply_preset();
  current_scenario_name = starting_preset;

  // Reset insertion object type to scenario default (or 'Star') and update button
  SETTINGS.input_object_type = SETTINGS.input_object_type || 'Star';
  updateObjectTypeButton();

  // Ensure inspector is hidden during initialization
  hideObjectInspector();

  // Update physics settings
  updatePhysicsSettings(SETTINGS);
  
  state.zoom = SETTINGS.preset_zoom || 1.5; // Use preset zoom or default to 1.5
  state.pan = { x: 0.0, y: 0.0 };
  // Clear all arrays instead of reassigning them
  bh_list.length = 0;
  planets.length = 0;
  stars.length = 0;
  gas_giants.length = 0;
  asteroids.length = 0;
  comets.length = 0;
  neutron_stars.length = 0;
  white_dwarfs.length = 0;
  debris.length = 0;
  particles.length = 0;
  gravity_ripples.length = 0;
  accretion_disk_particles.length = 0;
  particlePool.clear(); // Clear particle pool
  resetPhysicsObjectCounter();
  
  // Clear all energy history when simulation resets
  clearAllEnergyHistory();

  // Add central stars for specific presets
  if (['Kuiper Belt', 'Rogue Encounter', 'Solar System'].includes(starting_preset)) {
    stars.push(new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1.0));
  }

  // Add stars based on num_stars setting
  if (SETTINGS.num_stars) {
      for (let i = 0; i < SETTINGS.num_stars; i++) {
      stars.push(new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }));
    }
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
  if (SETTINGS.use_individual_ns_masses && SETTINGS.ns_masses && SETTINGS.ns_masses.length > 0) {
    for (let i = 0; i < SETTINGS.num_neutron_stars; i++) {
      const mass = SETTINGS.ns_masses[i] || 1.4; // Default to 1.4 M☉ if not specified
      neutron_stars.push(new NeutronStar({ x: 0, y: 0 }, { x: 0, y: 0 }, mass * SOLAR_MASS_UNIT, null));
    }
  } else {
    for (let i = 0; i < (SETTINGS.num_neutron_stars || 0); i++) {
      neutron_stars.push(new NeutronStar({ x: 0, y: 0 }, { x: 0, y: 0 }, null, null));
    }
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

  // Add comets
  if (SETTINGS.num_comets) {
    for (let i = 0; i < SETTINGS.num_comets; i++) {
      comets.push(new Comet({ x: 0, y: 0 }, { x: 0, y: 0 }));
    }
  }

  // Apply placement patterns to position objects
  apply_placement();
  
  // --- Fix for GW150914 scenario: two black holes in close inspiral ---
  if (starting_preset === 'GW150914' && bh_list.length >= 2) {
    const separation = 90; // Slightly closer for faster merger
    const m1 = bh_list[0].mass;
    const m2 = bh_list[1].mass;
    const totalMass = m1 + m2;
    // Center of mass positions
    const r1 = separation * (m2 / totalMass);
    const r2 = separation * (m1 / totalMass);
    bh_list[0].pos.x = -r1;
    bh_list[0].pos.y = 0;
    bh_list[1].pos.x = r2;
    bh_list[1].pos.y = 0;
    // Orbital velocities
    const G = SETTINGS.gravitational_constant;
    const orbitalSpeed = Math.sqrt(G * totalMass / separation);
    bh_list[0].vel.x = 0;
    bh_list[0].vel.y = orbitalSpeed * (m2 / totalMass);
    bh_list[1].vel.x = 0;
    bh_list[1].vel.y = -orbitalSpeed * (m1 / totalMass);
    // Add stronger perturbation to ensure inspiral
    const perturbation = 0.92;
    bh_list[0].vel.y *= perturbation;
    bh_list[1].vel.y *= perturbation;
  }
  
  // Show enhanced scenario info box
  show_enhanced_scenario_info(starting_preset);

  // Special scenario setups
  if (starting_preset === 'Binary Star System') {
    // Clear any existing stars and create binary system
    stars.length = 0;
    
    // Create two stars in binary orbit
    const star1 = new StarObject({ x: -60, y: 0 }, { x: 0, y: 12 }, 1.2);
    const star2 = new StarObject({ x: 60, y: 0 }, { x: 0, y: -12 }, 0.8);
    stars.push(star1, star2);
    
    // Add planets orbiting the binary system
    const centralMass = star1.mass + star2.mass;
    for (let i = 0; i < SETTINGS.num_planets; i++) {
      const r = 150 + i * 30; // Orbital radius around binary center
      const theta = Math.random() * 2 * Math.PI;
      const v = Math.sqrt((SETTINGS.gravitational_constant * centralMass) / r);
      const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
      const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
      planets[i].pos = pos;
      planets[i].vel = vel;
    }
    
    // Add gas giants
    for (let i = 0; i < SETTINGS.num_gas_giants; i++) {
      const r = 300 + i * 50;
      const theta = Math.random() * 2 * Math.PI;
      const v = Math.sqrt((SETTINGS.gravitational_constant * centralMass) / r);
      const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
      const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
      gas_giants[i].pos = pos;
      gas_giants[i].vel = vel;
    }
    
    // Add asteroids
    if (SETTINGS.enable_asteroids) {
      for (let i = 0; i < SETTINGS.num_asteroids; i++) {
        const r = 400 + Math.random() * 100;
        const theta = Math.random() * 2 * Math.PI;
        const v = Math.sqrt((SETTINGS.gravitational_constant * centralMass) / r);
        const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
        const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
        asteroids[i].pos = pos;
        asteroids[i].vel = vel;
      }
    }
  } else if (starting_preset === 'Solar System') {
    // Clear any existing objects
    stars.length = 0;
    planets.length = 0;
    gas_giants.length = 0;
    asteroids.length = 0;
    comets.length = 0;
    
    // Create the Sun as a proper G-type main sequence star with accurate properties
    const sun = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1.0);
    sun.name = 'Sol'; // Real name of our sun
    sun.mass = SOLAR_MASS_UNIT; // 1 solar mass = 1000 units
    sun.massInSuns = 1.0; // Exactly 1 solar mass
    sun.baseColor = '#FFFF00'; // G-type star color (yellow, like our Sun)
    sun.radius = 15; // Make sun larger for visibility
    sun.temperature = 5778; // Kelvin (real solar effective temperature)
    sun.spectralType = 'G2V'; // Real spectral classification
    sun.age = 4.6; // Billion years (middle-aged G-type star)
    sun.luminosity = 1.0; // Solar luminosity (3.828×10²⁶ W)
    sun.solarRadius = 1.0; // 1.0 solar radii (696,340 km)
    sun.metallicity = 0.02; // Solar metallicity (Z = 0.02)
    sun.rotationPeriod = 25.4; // Days (solar rotation period at equator)
    sun.surfaceGravity = 274; // m/s² (solar surface gravity)
    sun.density = 1408; // kg/m³ (solar density)
    sun.isSolarSystemSun = true; // Flag for Solar System sun
    stars.push(sun);
    
    // Real Solar System data with accurate properties
    // Distances in AU (scaled down for simulation), masses in Earth masses, diameters in km
    const solarSystemData = [
      { 
        name: 'Mercury', 
        mass: 0.055, // 0.055 Earth masses
        distance: 80, // ~0.39 AU (scaled) - increased for stability
        diameter: 4879, // km
        orbital_period: 88, // days
        type: 'terrestrial',
        color: '#A0522D', // Mercury's actual color (brownish-gray)
        density: 'rocky',
        temperature: 440, // Kelvin (daytime surface temperature)
        gravity: 3.7, // m/s²
        rotation_period: 58.6, // days (slow rotation)
        atmosphere: 'none',
        density_kg_m3: 5427, // kg/m³
        escape_velocity: 4.25, // km/s
        surface_pressure: 0 // Pa (no atmosphere)
      },
      { 
        name: 'Venus', 
        mass: 0.815, // 0.815 Earth masses
        distance: 120, // ~0.72 AU (scaled) - increased for stability
        diameter: 12104, // km
        orbital_period: 225, // days
        type: 'terrestrial',
        color: '#E6BE8A', // Venus's actual color (creamy yellow-brown)
        density: 'rocky',
        temperature: 737, // Kelvin (surface temperature)
        gravity: 8.87, // m/s²
        rotation_period: -243, // days (retrograde rotation)
        atmosphere: 'CO2',
        density_kg_m3: 5243, // kg/m³
        escape_velocity: 10.36, // km/s
        surface_pressure: 9200000 // Pa (92 bar)
      },
      { 
        name: 'Earth', 
        mass: 1.0, // 1 Earth mass
        distance: 160, // ~1 AU (scaled) - increased for stability
        diameter: 12742, // km
        orbital_period: 365, // days
        type: 'terrestrial',
        color: '#4B7BE5', // Earth's actual color (blue oceans)
        density: 'rocky',
        temperature: 288, // Kelvin (average surface temperature)
        gravity: 9.81, // m/s²
        rotation_period: 1.0, // days
        atmosphere: 'N2/O2',
        density_kg_m3: 5514, // kg/m³
        escape_velocity: 11.19, // km/s
        surface_pressure: 101325 // Pa (1 bar)
      },
      { 
        name: 'Mars', 
        mass: 0.107, // 0.107 Earth masses
        distance: 200, // ~1.52 AU (scaled) - increased for stability
        diameter: 6779, // km
        orbital_period: 687, // days
        type: 'terrestrial',
        color: '#C1440E', // Mars's actual color (reddish-orange)
        density: 'rocky',
        temperature: 210, // Kelvin (average surface temperature)
        gravity: 3.71, // m/s²
        rotation_period: 1.03, // days
        atmosphere: 'CO2',
        density_kg_m3: 3933, // kg/m³
        escape_velocity: 5.03, // km/s
        surface_pressure: 636 // Pa (0.006 bar)
      },
      { 
        name: 'Jupiter', 
        mass: 317.8, // 317.8 Earth masses
        distance: 350, // ~5.2 AU (scaled) - increased for stability
        diameter: 139822, // km
        orbital_period: 4333, // days
        type: 'gas_giant',
        color: '#D8CA9D', // Jupiter's actual color (beige with bands)
        giantType: 'jupiter_like',
        temperature: 165, // Kelvin (cloud top temperature)
        gravity: 24.79, // m/s²
        rotation_period: 0.41, // days (fast rotation)
        atmosphere: 'H2/He',
        density_kg_m3: 1326, // kg/m³
        escape_velocity: 59.5, // km/s
        surface_pressure: 100000 // Pa (1 bar at cloud tops)
      },
      { 
        name: 'Saturn', 
        mass: 95.2, // 95.2 Earth masses
        distance: 500, // ~9.5 AU (scaled) - increased for stability
        diameter: 116464, // km
        orbital_period: 10759, // days
        type: 'gas_giant',
        color: '#F4D03F', // Saturn's actual color (golden yellow)
        giantType: 'jupiter_like',
        temperature: 134, // Kelvin (cloud top temperature)
        gravity: 10.44, // m/s²
        rotation_period: 0.45, // days (fast rotation)
        atmosphere: 'H2/He',
        density_kg_m3: 687, // kg/m³
        escape_velocity: 35.5, // km/s
        surface_pressure: 100000 // Pa (1 bar at cloud tops)
      },
      { 
        name: 'Uranus', 
        mass: 14.5, // 14.5 Earth masses
        distance: 650, // ~19.2 AU (scaled) - increased for stability
        diameter: 50724, // km
        orbital_period: 30687, // days
        type: 'ice_giant',
        color: '#85C1E9', // Uranus's actual color (light blue-green)
        giantType: 'neptune_like',
        temperature: 76, // Kelvin (cloud top temperature)
        gravity: 8.69, // m/s²
        rotation_period: -0.72, // days (retrograde rotation)
        atmosphere: 'H2/He/CH4',
        density_kg_m3: 1271, // kg/m³
        escape_velocity: 21.3, // km/s
        surface_pressure: 100000 // Pa (1 bar at cloud tops)
      },
      { 
        name: 'Neptune', 
        mass: 17.1, // 17.1 Earth masses
        distance: 800, // ~30.1 AU (scaled) - increased for stability
        diameter: 49244, // km
        orbital_period: 60190, // days
        type: 'ice_giant',
        color: '#5B5DDF', // Neptune's actual color (deep blue)
        giantType: 'neptune_like',
        temperature: 72, // Kelvin (cloud top temperature)
        gravity: 11.15, // m/s²
        rotation_period: 0.67, // days
        atmosphere: 'H2/He/CH4',
        density_kg_m3: 1638, // kg/m³
        escape_velocity: 23.5, // km/s
        surface_pressure: 100000 // Pa (1 bar at cloud tops)
      }
    ];
    
    // Create planets with realistic properties
    for (let i = 0; i < solarSystemData.length; i++) {
      const planetData = solarSystemData[i];
      const r = planetData.distance;
      const theta = Math.random() * 2 * Math.PI;
      // Calculate orbital velocity based on real orbital periods
      const orbitalVelocity = Math.sqrt((SETTINGS.gravitational_constant * sun.mass) / r);
      const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
      const vel = { x: -orbitalVelocity * Math.sin(theta), y: orbitalVelocity * Math.cos(theta) };
      
      if (planetData.type === 'gas_giant' || planetData.type === 'ice_giant') {
        // Create new gas giant objects
        const gasGiant = new GasGiant(pos, vel, planetData.mass / 50.0); // Convert to Jupiter masses
        gasGiant.name = planetData.name;
        gasGiant.mass = planetData.mass * EARTH_MASS_UNIT;
        gasGiant.diameter = planetData.diameter;
        gasGiant.orbital_period = planetData.orbital_period;
        gasGiant.baseColor = planetData.color;
        gasGiant.giantType = planetData.giantType;
        // Add accurate physical properties
        gasGiant.temperature = planetData.temperature;
        gasGiant.gravity = planetData.gravity;
        gasGiant.rotation_period = planetData.rotation_period;
        gasGiant.atmosphere = planetData.atmosphere;
        gasGiant.density_kg_m3 = planetData.density_kg_m3;
        gasGiant.escape_velocity = planetData.escape_velocity;
        gasGiant.surface_pressure = planetData.surface_pressure;
        gasGiant.isSolarSystemPlanet = true; // Flag for Solar System planets
        gas_giants.push(gasGiant);
      } else {
        // Create new terrestrial planet objects
        const planet = new Planet(pos, vel, planetData.mass);
        planet.name = planetData.name;
        planet.mass = planetData.mass * EARTH_MASS_UNIT;
        planet.diameter = planetData.diameter;
        planet.orbital_period = planetData.orbital_period;
        planet.baseColor = planetData.color;
        planet.density = planetData.density;
        // Add accurate physical properties
        planet.temperature = planetData.temperature;
        planet.gravity = planetData.gravity;
        planet.rotation_period = planetData.rotation_period;
        planet.atmosphere = planetData.atmosphere;
        planet.density_kg_m3 = planetData.density_kg_m3;
        planet.escape_velocity = planetData.escape_velocity;
        planet.surface_pressure = planetData.surface_pressure;
        planet.isSolarSystemPlanet = true; // Flag for Solar System planets
        planets.push(planet);
      }
    }
    
    // Add asteroid belt between Mars and Jupiter with real asteroids
    if (SETTINGS.enable_asteroids) {
      const realAsteroids = [
        { name: 'Ceres', diameter: 939, distance: 280, mass: 0.00016 }, // Dwarf planet - between Mars and Jupiter
        { name: 'Vesta', diameter: 525, distance: 285, mass: 0.00004 },
        { name: 'Pallas', diameter: 512, distance: 290, mass: 0.00003 },
        { name: 'Hygiea', diameter: 434, distance: 295, mass: 0.00002 },
        { name: 'Interamnia', diameter: 350, distance: 300, mass: 0.00001 },
        { name: 'Europa', diameter: 315, distance: 305, mass: 0.000008 },
        { name: 'Davida', diameter: 289, distance: 310, mass: 0.000006 },
        { name: 'Sylvia', diameter: 286, distance: 315, mass: 0.000006 },
        { name: 'Hektor', diameter: 225, distance: 320, mass: 0.000003 },
        { name: 'Juno', diameter: 257, distance: 325, mass: 0.000004 },
        { name: 'Iris', diameter: 200, distance: 330, mass: 0.000002 },
        { name: 'Eunomia', diameter: 255, distance: 335, mass: 0.000004 },
        { name: 'Psyche', diameter: 226, distance: 340, mass: 0.000003 },
        { name: 'Themis', diameter: 198, distance: 345, mass: 0.000002 },
        { name: 'Bamberga', diameter: 229, distance: 350, mass: 0.000003 },
        { name: 'Patientia', diameter: 225, distance: 355, mass: 0.000003 }
      ];
      
      for (let i = 0; i < Math.min(SETTINGS.num_asteroids, realAsteroids.length); i++) {
        const asteroidData = realAsteroids[i];
        const r = asteroidData.distance + (Math.random() - 0.5) * 20; // Add some variation for wider spacing
        const theta = Math.random() * 2 * Math.PI;
        const v = Math.sqrt((SETTINGS.gravitational_constant * sun.mass) / r);
        const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
        const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
        
        // Create new asteroid object
        const asteroid = new Asteroid(pos, vel);
        asteroid.name = asteroidData.name;
        asteroid.diameter = asteroidData.diameter;
        asteroid.mass = asteroidData.mass * EARTH_MASS_UNIT;
        asteroids.push(asteroid);
      }
    }
    
    // Add famous comets in distant orbits with real properties
    if (SETTINGS.num_comets) {
      const famousComets = [
        { name: 'Halley', period: 76, perihelion: 0.586, aphelion: 35.1, diameter: 11 },
        { name: 'Hale-Bopp', period: 2533, perihelion: 0.914, aphelion: 370.8, diameter: 60 },
        { name: 'Hyakutake', period: 113783, perihelion: 0.230, aphelion: 4698.77, diameter: 4.2 },
        { name: 'Shoemaker-Levy 9', period: 11.3, perihelion: 5.4, aphelion: 7.8, diameter: 1.8 },
        { name: 'Comet ISON', period: 400000, perihelion: 0.012, aphelion: 73000, diameter: 2 },
        { name: 'Lovejoy', period: 314, perihelion: 0.005, aphelion: 157, diameter: 0.5 },
        { name: 'McNaught', period: 92, perihelion: 0.17, aphelion: 67, diameter: 19 },
        { name: 'Pan-STARRS', period: 110000, perihelion: 0.3, aphelion: 16000, diameter: 1 },
        { name: 'Swift-Tuttle', period: 133, perihelion: 0.96, aphelion: 51.2, diameter: 26 },
        { name: 'Tempel-Tuttle', period: 33, perihelion: 0.98, aphelion: 19.7, diameter: 3.6 },
        { name: 'Wild 2', period: 6.4, perihelion: 1.59, aphelion: 5.3, diameter: 5.5 },
        { name: 'Hartley 2', period: 6.46, perihelion: 1.05, aphelion: 5.87, diameter: 1.2 }
      ];
      
      for (let i = 0; i < Math.min(SETTINGS.num_comets, famousComets.length); i++) {
        const cometData = famousComets[i];
        // Use semi-major axis for distance (average of perihelion and aphelion)
        const semiMajorAxis = (cometData.perihelion + cometData.aphelion) / 2;
        const r = semiMajorAxis * 15; // Scale for simulation
        const theta = Math.random() * 2 * Math.PI;
        const v = Math.sqrt((SETTINGS.gravitational_constant * sun.mass) / r) * 0.7; // Comets are slower
        const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
        const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
        
        // Create new comet object with real properties
        const comet = new Comet(pos, vel);
        comet.name = cometData.name;
        comet.period = cometData.period;
        comet.perihelion = cometData.perihelion;
        comet.aphelion = cometData.aphelion;
        comet.diameter = cometData.diameter;
        comets.push(comet);
      }
    }
  } else if (starting_preset === 'Rogue Encounter') {
    // Set up central star system first
    const centralStar = stars[0];
    const centralMass = centralStar.mass;
    
    // Position planets around the central star
    for (let i = 0; i < SETTINGS.num_planets; i++) {
      const r = 50 + i * 25;
      const theta = Math.random() * 2 * Math.PI;
      const v = Math.sqrt((SETTINGS.gravitational_constant * centralMass) / r);
      const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
      const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
      planets[i].pos = pos;
      planets[i].vel = vel;
    }
    
    // Position gas giants
    for (let i = 0; i < SETTINGS.num_gas_giants; i++) {
      const r = 200 + i * 50;
      const theta = Math.random() * 2 * Math.PI;
      const v = Math.sqrt((SETTINGS.gravitational_constant * centralMass) / r);
      const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
      const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
      gas_giants[i].pos = pos;
      gas_giants[i].vel = vel;
    }
    
    // Position asteroids
    if (SETTINGS.enable_asteroids) {
      for (let i = 0; i < SETTINGS.num_asteroids; i++) {
        const r = 350 + Math.random() * 100;
        const theta = Math.random() * 2 * Math.PI;
        const v = Math.sqrt((SETTINGS.gravitational_constant * centralMass) / r);
        const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
        const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
        asteroids[i].pos = pos;
        asteroids[i].vel = vel;
      }
    }
    
    // Position rogue black hole to approach the system
    if (bh_list.length > 0) {
      bh_list[0].pos = { x: -800, y: 200 }; // Start far away
      bh_list[0].vel = { x: 20, y: -5 }; // Approach velocity
    }
  } else if (starting_preset === 'Kuiper Belt') {
    // Set up central star system (our Sun)
    const centralStar = stars[0];
    centralStar.name = 'Sol';
    const centralMass = centralStar.mass;
    
    // Real Kuiper Belt objects with accurate names and properties
    const kuiperBeltObjects = [
      { name: 'Pluto', mass: 0.0022, distance: 200, type: 'dwarf_planet' },
      { name: 'Eris', mass: 0.0028, distance: 220, type: 'dwarf_planet' },
      { name: 'Haumea', mass: 0.0007, distance: 240, type: 'dwarf_planet' },
      { name: 'Makemake', mass: 0.0005, distance: 260, type: 'dwarf_planet' },
      { name: 'Quaoar', mass: 0.0002, distance: 280, type: 'large_kbo' },
      { name: 'Sedna', mass: 0.0001, distance: 300, type: 'large_kbo' },
      { name: 'Orcus', mass: 0.0001, distance: 320, type: 'large_kbo' },
      { name: 'Varuna', mass: 0.0001, distance: 340, type: 'large_kbo' }
    ];
    
    // Create Kuiper Belt objects
    for (let i = 0; i < Math.min(kuiperBeltObjects.length, SETTINGS.num_planets); i++) {
      const kboData = kuiperBeltObjects[i];
      const r = kboData.distance;
      const theta = Math.random() * 2 * Math.PI;
      const v = Math.sqrt((SETTINGS.gravitational_constant * centralMass) / r);
      const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
      const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
      
      if (kboData.type === 'dwarf_planet') {
        // Use planets array for dwarf planets
        if (planets.length > 0) {
          planets[0].pos = pos;
          planets[0].vel = vel;
          planets[0].mass = kboData.mass * EARTH_MASS_UNIT;
          planets[0].name = kboData.name;
          planets.splice(0, 1);
        }
      } else {
        // Use gas giants array for large KBOs
        if (gas_giants.length > 0) {
          gas_giants[0].pos = pos;
          gas_giants[0].vel = vel;
          gas_giants[0].mass = kboData.mass * EARTH_MASS_UNIT;
          gas_giants[0].name = kboData.name;
          gas_giants.splice(0, 1);
        }
      }
    }
    
    // Add smaller Kuiper Belt objects as asteroids
    if (SETTINGS.enable_asteroids) {
      const smallKBOs = [
        'Ixion', 'Huya', '2002 AW197', '2002 UX25', '2002 TX300', '2003 AZ84',
        '2003 VS2', '2004 GV9', '2005 RN43', '2005 UQ513', '2006 QH181', '2007 OR10'
      ];
      
      for (let i = 0; i < Math.min(SETTINGS.num_asteroids, smallKBOs.length); i++) {
        const r = 500 + Math.random() * 200; // Kuiper Belt region
        const theta = Math.random() * 2 * Math.PI;
        const v = Math.sqrt((SETTINGS.gravitational_constant * centralMass) / r);
        const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
        const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
        asteroids[i].pos = pos;
        asteroids[i].vel = vel;
        asteroids[i].name = smallKBOs[i];
      }
    }
  } else if (starting_preset === 'Sagittarius A*') {
    // Set up Sagittarius A* with correct name
    if (bh_list.length > 0) {
      bh_list[0].name = 'Sagittarius A*';
    }
    
    // Add some real S-stars that orbit Sgr A* (the most famous ones)
    const sStars = [
      'S2', 'S12', 'S14', 'S1', 'S8', 'S13', 'S9', 'S6', 'S4', 'S7',
      'S31', 'S21', 'S24', 'S54', 'S55', 'S60', 'S66', 'S67', 'S83', 'S87'
    ];
    
    // Name some of the stars with real S-star names
    for (let i = 0; i < Math.min(stars.length, sStars.length); i++) {
      stars[i].name = sStars[i];
    }
    
    // Name some neutron stars with real names from the galactic center
    const galacticNeutronStars = [
      'SGR J1745-2900', 'PSR J1745-2900', 'PSR J1746-2850', 'PSR J1745-2912',
      'PSR J1746-2849', 'PSR J1745-2910', 'PSR J1746-2856', 'PSR J1745-2909'
    ];
    
    for (let i = 0; i < Math.min(neutron_stars.length, galacticNeutronStars.length); i++) {
      neutron_stars[i].name = galacticNeutronStars[i];
    }
  } else if (starting_preset === 'Binary Star System') {
    // Set up binary star system with real binary star names
    const realBinaryStars = [
      'Alpha Centauri A', 'Alpha Centauri B', 'Sirius A', 'Sirius B', 'Procyon A', 'Procyon B',
      'Castor A', 'Castor B', 'Algol A', 'Algol B', 'Beta Lyrae A', 'Beta Lyrae B',
      'W Ursae Majoris A', 'W Ursae Majoris B', 'RS Canum Venaticorum A', 'RS Canum Venaticorum B'
    ];
    
    // Name the binary stars
    for (let i = 0; i < Math.min(stars.length, 2); i++) {
      stars[i].name = realBinaryStars[i];
    }
    
    // Name planets with real exoplanet names from binary systems
    const binaryExoplanets = [
      'Kepler-16b', 'Kepler-34b', 'Kepler-35b', 'Kepler-38b', 'Kepler-47b', 'Kepler-47c',
      'Kepler-64b', 'Kepler-413b', 'Kepler-453b', 'Kepler-1647b'
    ];
    
    for (let i = 0; i < Math.min(planets.length, binaryExoplanets.length); i++) {
      planets[i].name = binaryExoplanets[i];
    }
  } else if (starting_preset === 'Pulsar System') {
    // Set up pulsar system with real pulsar and planet names
    if (neutron_stars.length > 0) {
      neutron_stars[0].name = 'PSR B1257+12'; // The real pulsar with the first confirmed exoplanets
    }
    
    // Name planets with the real planets discovered around PSR B1257+12
    const pulsarPlanets = ['PSR B1257+12 b', 'PSR B1257+12 c', 'PSR B1257+12 d'];
    
    for (let i = 0; i < Math.min(planets.length, pulsarPlanets.length); i++) {
      planets[i].name = pulsarPlanets[i];
    }
  } else if (starting_preset === 'Neutron Star Collision') {
    // Set up neutron star collision based on GW170817
    if (neutron_stars.length >= 2) {
      neutron_stars[0].name = 'GW170817-A';
      neutron_stars[1].name = 'GW170817-B';
    }
  } else if (starting_preset === 'Earth-Moon System') {
    // Clear any existing objects and create Earth-Moon system
    stars.length = 0;
    planets.length = 0;
    gas_giants.length = 0;
    asteroids.length = 0;
    comets.length = 0;
    bh_list.length = 0; // Clear any black holes
    neutron_stars.length = 0; // Clear any neutron stars
    white_dwarfs.length = 0; // Clear any white dwarfs
    debris.length = 0; // Clear any debris
    
    // Create Earth at the center (we'll treat it as the primary body)
    const earth = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 }, 1.0);
    earth.name = 'Earth';
    earth.mass = 1.0 * EARTH_MASS_UNIT; // 1 Earth mass
    earth.diameter = 12742; // km
    earth.orbital_period = 365; // days (Earth's orbital period around Sun)
    earth.baseColor = '#4B7BE5'; // More accurate Earth blue color
    earth.radius = 12; // Make Earth larger for visibility
    earth.density = 'rocky';
    earth.isEarth = true; // Flag for custom Earth rendering
    // Accurate Earth properties
    earth.temperature = 288; // Kelvin (average surface temperature)
    earth.gravity = 9.81; // m/s²
    earth.rotation_period = 1.0; // days
    earth.atmosphere = 'N2/O2';
    earth.density_kg_m3 = 5514; // kg/m³
    earth.escape_velocity = 11.19; // km/s
    earth.surface_pressure = 101325; // Pa (1 bar)
    earth.magnetic_field = 25; // μT (microtesla)
    earth.albedo = 0.306; // Bond albedo
    planets.push(earth);
    
    // Create Moon orbiting Earth
    const moonDistance = 35; // Distance from Earth (scaled for better visibility)
    const moonOrbitalVelocity = Math.sqrt((SETTINGS.gravitational_constant * earth.mass) / moonDistance);
    const moonTheta = Math.random() * 2 * Math.PI;
    const moonPos = { x: moonDistance * Math.cos(moonTheta), y: moonDistance * Math.sin(moonTheta) };
    const moonVel = { x: -moonOrbitalVelocity * Math.sin(moonTheta), y: moonOrbitalVelocity * Math.cos(moonTheta) };
    
    const moon = new Planet(moonPos, moonVel, 0.0123); // Moon is 0.0123 Earth masses
    moon.name = 'Luna';
    moon.mass = 0.0123 * EARTH_MASS_UNIT; // Moon mass
    moon.diameter = 3474; // km
    moon.orbital_period = 27.3; // days (Moon's orbital period around Earth)
    moon.baseColor = '#8B8B8B'; // More accurate Moon gray color
    moon.radius = 3; // Moon is smaller than Earth but visible
    moon.density = 'rocky';
    moon.isMoon = true; // Flag for custom Moon rendering
    // Accurate Moon properties
    moon.temperature = 250; // Kelvin (average surface temperature)
    moon.gravity = 1.62; // m/s²
    moon.rotation_period = 27.3; // days (tidally locked)
    moon.atmosphere = 'none';
    moon.density_kg_m3 = 3344; // kg/m³
    moon.escape_velocity = 2.38; // km/s
    moon.surface_pressure = 0; // Pa (no atmosphere)
    moon.magnetic_field = 0; // μT (no significant magnetic field)
    moon.albedo = 0.136; // Bond albedo
    planets.push(moon);
    
    // Set up zoom and pan to focus on the Earth-Moon system
    // This will be handled by the camera system to show both objects clearly
    SETTINGS.sim_size = 'Small'; // Use small simulation size for better zoom
  }
  // --- Fix for Binary BH scenario: two black holes in mutual orbit, planets orbiting center of mass ---
  else if (starting_preset === 'Binary BH') {
    if (bh_list.length >= 2) {
      const separation = 120;
      const m1 = bh_list[0].mass;
      const m2 = bh_list[1].mass;
      const totalMass = m1 + m2;
      // Center of mass positions
      const r1 = separation * (m2 / totalMass);
      const r2 = separation * (m1 / totalMass);
      bh_list[0].pos.x = -r1;
      bh_list[0].pos.y = 0;
      bh_list[1].pos.x = r2;
      bh_list[1].pos.y = 0;
      // Orbital velocities
      const G = SETTINGS.gravitational_constant;
      const orbitalSpeed = Math.sqrt(G * totalMass / separation);
      bh_list[0].vel.x = 0;
      bh_list[0].vel.y = orbitalSpeed * (m2 / totalMass);
      bh_list[1].vel.x = 0;
      bh_list[1].vel.y = -orbitalSpeed * (m1 / totalMass);
      // Add slight perturbation to start inspiral
      const perturbation = 0.95;
      bh_list[0].vel.y *= perturbation;
      bh_list[1].vel.y *= perturbation;
      // Place planets in orbits around the binary's center of mass
      for (let i = 0; i < planets.length; i++) {
        const r = 180 + i * 30;
        const theta = Math.random() * 2 * Math.PI;
        const v = Math.sqrt((G * totalMass) / r);
        const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
        const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
        planets[i].pos = pos;
        planets[i].vel = vel;
      }
      // Place gas giants
      for (let i = 0; i < gas_giants.length; i++) {
        const r = 350 + i * 50;
        const theta = Math.random() * 2 * Math.PI;
        const v = Math.sqrt((G * totalMass) / r);
        const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
        const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
        gas_giants[i].pos = pos;
        gas_giants[i].vel = vel;
      }
      // Place asteroids
      if (SETTINGS.enable_asteroids) {
        for (let i = 0; i < asteroids.length; i++) {
          const r = 500 + Math.random() * 100;
          const theta = Math.random() * 2 * Math.PI;
          const v = Math.sqrt((G * totalMass) / r);
          const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
          const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
          asteroids[i].pos = pos;
          asteroids[i].vel = vel;
        }
      }
    }
  } else if (starting_preset === 'TRAPPIST-1 System') {
    // Clear planets array
    planets.length = 0;
    // TRAPPIST-1 star properties
    if (stars.length > 0) {
      const star = stars[0];
      star.name = 'TRAPPIST-1';
      star.mass = 0.089 * SOLAR_MASS_UNIT; // 0.089 solar masses
      star.baseColor = '#a83232'; // Cool red dwarf
      star.radius = 7; // Small star
      star.temperature = 2550; // K
      star.spectralType = 'M8V';
    }
    // TRAPPIST-1 planets (b-h), semi-major axes in AU, masses in Earth masses, radii in Earth radii
    const planetsData = [
      { name: 'b', a: 0.0115, mass: 1.017, radius: 1.121 },
      { name: 'c', a: 0.0158, mass: 1.156, radius: 1.095 },
      { name: 'd', a: 0.0223, mass: 0.297, radius: 0.784 },
      { name: 'e', a: 0.0292, mass: 0.772, radius: 0.910 },
      { name: 'f', a: 0.0385, mass: 0.934, radius: 1.046 },
      { name: 'g', a: 0.0469, mass: 1.148, radius: 1.148 },
      { name: 'h', a: 0.0619, mass: 0.326, radius: 0.773 },
    ];
    const AU = 400; // Increased scale factor for more spacing
    const starMass = 0.089 * SOLAR_MASS_UNIT;
    for (let i = 0; i < planetsData.length; i++) {
      const p = planetsData[i];
      const r = p.a * AU;
      // Place each planet at a unique angle, evenly spaced
      const theta = (i / planetsData.length) * 2 * Math.PI;
      const v = Math.sqrt((SETTINGS.gravitational_constant * starMass) / r);
      const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
      const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
      // Scale planet radius: 1 Earth radius = 1.2 sim units
      const simRadius = p.radius * 1.2;
      const planet = new Planet(pos, vel, p.mass);
      planet.name = `TRAPPIST-1${p.name}`;
      planet.mass = p.mass * EARTH_MASS_UNIT;
      planet.baseColor = '#6ec6ff';
      planet.radius = simRadius;
      planet.isTrappist = true;
      planets.push(planet);
    }
  }

  // In initialize_simulation(), at the end, add:
  generateStarfield();
};

// Settings functions
const setting_items = [
  {
    label: 'Preset Scenario',
    key: 'preset_scenario',
    type: 'option',
    options: [
      'None',
      'Solar System',
      'Earth-Moon System',
      'TRAPPIST-1 System',
      'GW150914',
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
      'Quasar Cannon',
      'The Pinwheel Galaxy Core',
      'Star Frisbee',
      'Kessler Cascade',
      'Alien Dyson Swarm Collapse',
      'Tidal Arm Tango',
      'Hungry Hungry Holes',
      'Slingshot Gauntlet',
      'Black Hole Billiards',
      'Stellar Nursery',
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
  {
    label: 'Number of Stars',
    key: 'num_stars',
    type: 'int',
    min: 0,
    max: 20,
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
    label: 'Number of Comets',
    key: 'num_comets',
    type: 'int',
    min: 0,
    max: 100,
    step: 1,
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
      'Comet',
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
      'Asteroid',
      'Comet',
      'NeutronStar',
      'WhiteDwarf',
    ],
  },
  { label: 'Show Overlays', key: 'show_dynamic_overlays', type: 'bool' },
  { label: 'Record Simulation', key: 'record_simulation', type: 'bool' },
  { label: 'Show Gravitational Waves', key: 'show_gravitational_waves', type: 'bool' },
];
// ===== Reusable Tooltip System =====
class TooltipManager {
  constructor() {
    this.activeTooltip = null;
    this.tooltipElement = null;
    this.init();
  }

  init() {
    // Create tooltip element
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'tooltip-system';
    this.tooltipElement.style.cssText = `
      position: fixed;
      background: rgba(34, 34, 34, 0.9);
      color: #e0e0e0;
      padding: 16px 20px;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.4;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(0, 170, 255, 0.2);
      z-index: 10000;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
      max-width: 280px;
      word-wrap: break-word;
      white-space: normal;
      font-family: 'Inter', sans-serif;
    `;
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'tooltip-close';
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: #888;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 0.2s ease;
      line-height: 1;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.color = '#e0e0e0';
      closeButton.style.background = 'rgba(255, 255, 255, 0.1)';
    });
    
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.color = '#888';
      closeButton.style.background = 'none';
    });
    
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });
    
    // Add arrow
    const arrow = document.createElement('div');
    arrow.className = 'tooltip-arrow';
    arrow.style.cssText = `
      position: absolute;
      width: 0;
      height: 0;
      border: 6px solid transparent;
    `;
    
    this.tooltipElement.appendChild(closeButton);
    this.tooltipElement.appendChild(arrow);
    
    document.body.appendChild(this.tooltipElement);
    
    // Add event listeners
    document.addEventListener('click', this.handleOutsideClick.bind(this));
    document.addEventListener('keydown', this.handleKeydown.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
    window.addEventListener('scroll', this.handleScroll.bind(this));
  }

  show(tooltipText, triggerElement, options = {}) {
    // Hide any existing tooltip
    this.hide();
    
    // Create content container
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
      padding-right: 30px;
      margin-top: 8px;
    `;
    contentContainer.textContent = tooltipText;
    
    // Clear existing content and add new content
    this.tooltipElement.innerHTML = '';
    
    // Re-add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'tooltip-close';
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: #888;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 0.2s ease;
      line-height: 1;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.color = '#e0e0e0';
      closeButton.style.background = 'rgba(255, 255, 255, 0.1)';
    });
    
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.color = '#888';
      closeButton.style.background = 'none';
    });
    
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });
    
    // Add arrow
    const arrow = document.createElement('div');
    arrow.className = 'tooltip-arrow';
    arrow.style.cssText = `
      position: absolute;
      width: 0;
      height: 0;
      border: 6px solid transparent;
    `;
    
    this.tooltipElement.appendChild(closeButton);
    this.tooltipElement.appendChild(contentContainer);
    this.tooltipElement.appendChild(arrow);
    
    // Position tooltip
    this.positionTooltip(triggerElement, options);
    
    // Show tooltip
    this.tooltipElement.style.visibility = 'visible';
    this.tooltipElement.style.opacity = '1';
    this.tooltipElement.style.pointerEvents = 'auto';
    
    // Store reference
    this.activeTooltip = {
      element: triggerElement,
      options
    };
  }

  hide() {
    if (this.tooltipElement) {
      this.tooltipElement.style.visibility = 'hidden';
      this.tooltipElement.style.opacity = '0';
      this.tooltipElement.style.pointerEvents = 'none';
    }
    this.activeTooltip = null;
  }

  positionTooltip(triggerElement, options = {}) {
    const tooltip = this.tooltipElement;
    const triggerRect = triggerElement.getBoundingClientRect();
    const arrow = tooltip.querySelector('.tooltip-arrow');
    
    // Default position (below the trigger)
    let position = options.position || 'bottom';
    let x = triggerRect.left + triggerRect.width / 2;
    let y = triggerRect.bottom + 8;
    
    // Calculate available space
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = tooltip.offsetWidth || 280;
    const tooltipHeight = tooltip.offsetHeight || 100;
    
    // Auto-position if not enough space
    if (position === 'bottom' && y + tooltipHeight > viewportHeight - 20) {
      position = 'top';
    }
    if (position === 'top' && y - tooltipHeight < 20) {
      position = 'bottom';
    }
    if (position === 'right' && x + tooltipWidth > viewportWidth - 20) {
      position = 'left';
    }
    if (position === 'left' && x - tooltipWidth < 20) {
      position = 'right';
    }
    
    // Adjust position based on final position
    switch (position) {
      case 'top':
        y = triggerRect.top - tooltipHeight - 8;
        x = triggerRect.left + triggerRect.width / 2;
        arrow.style.bottom = '-12px';
        arrow.style.left = '50%';
        arrow.style.transform = 'translateX(-50%)';
        arrow.style.borderTopColor = 'rgba(34, 34, 34, 0.9)';
        arrow.style.borderBottomColor = 'transparent';
        break;
      case 'bottom':
        y = triggerRect.bottom + 8;
        x = triggerRect.left + triggerRect.width / 2;
        arrow.style.top = '-12px';
        arrow.style.left = '50%';
        arrow.style.transform = 'translateX(-50%)';
        arrow.style.borderBottomColor = 'rgba(34, 34, 34, 0.9)';
        arrow.style.borderTopColor = 'transparent';
        break;
      case 'left':
        x = triggerRect.left - tooltipWidth - 8;
        y = triggerRect.top + triggerRect.height / 2;
        arrow.style.right = '-12px';
        arrow.style.top = '50%';
        arrow.style.transform = 'translateY(-50%)';
        arrow.style.borderLeftColor = 'rgba(34, 34, 34, 0.9)';
        arrow.style.borderRightColor = 'transparent';
        break;
      case 'right':
        x = triggerRect.right + 8;
        y = triggerRect.top + triggerRect.height / 2;
        arrow.style.left = '-12px';
        arrow.style.top = '50%';
        arrow.style.transform = 'translateY(-50%)';
        arrow.style.borderRightColor = 'rgba(34, 34, 34, 0.9)';
        arrow.style.borderLeftColor = 'transparent';
        break;
    }
    
    // Ensure tooltip stays within viewport bounds
    x = Math.max(10, Math.min(x, viewportWidth - tooltipWidth - 10));
    y = Math.max(10, Math.min(y, viewportHeight - tooltipHeight - 10));
    
    // Apply position
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  handleOutsideClick(event) {
    if (this.activeTooltip && !this.activeTooltip.element.contains(event.target) && !this.tooltipElement.contains(event.target)) {
      this.hide();
    }
  }

  handleKeydown(event) {
    if (event.key === 'Escape' && this.activeTooltip) {
      this.hide();
    }
  }

  handleResize() {
    if (this.activeTooltip) {
      this.positionTooltip(this.activeTooltip.element, this.activeTooltip.options);
    }
  }

  handleScroll() {
    if (this.activeTooltip) {
      this.positionTooltip(this.activeTooltip.element, this.activeTooltip.options);
    }
  }
}

// Create global tooltip manager instance
const tooltipManager = new TooltipManager();

// Function to get tooltip text for settings
const getSettingTooltip = (key, label) => {
  const tooltips = {
    // Simulation settings
    'gravitational_constant': 'Determines the strength of gravity in the simulation. Higher values exaggerate gravitational effects for visualization.',
    'sim_speed': 'Controls how fast the simulation runs. Higher values make time pass faster.',
    'mutual_gravity': 'When enabled, all objects attract each other. When disabled, only black holes create gravity.',
    'enable_star_merging': 'When enabled, stars and other objects can merge when they get too close to each other.',
    
    // Object counts
    'num_black_holes': 'Number of black holes in the simulation. Each black hole creates a strong gravitational field.',
    'bh_mass': 'Mass of black holes in solar masses (M☉). Higher mass creates stronger gravity.',
    'num_stars': 'Number of stars in the simulation. Stars are lighter than black holes but still create gravity.',
    'num_planets': 'Number of planets in the simulation. Planets are small objects that orbit around larger bodies.',
    'num_gas_giants': 'Number of gas giant planets. These are larger than regular planets.',
    'num_asteroids': 'Number of asteroids in the simulation. These are small rocky objects.',
    'num_comets': 'Number of comets. These objects have highly elliptical orbits.',
    'num_neutron_stars': 'Number of neutron stars. These are dense stellar remnants.',
    'num_white_dwarfs': 'Number of white dwarfs. These are small, dense stellar remnants.',
    
    // Behavior settings
    'bh_behavior': 'How black holes behave: Static (stationary), Orbiting (move in orbits), or Rogue (random movement).',
    'use_individual_bh_masses': 'Toggle to assign unique masses to each black hole instead of a shared mass.',
    
    // Visual settings
    'show_trails': 'When enabled, objects leave trails showing their recent path.',
    'trail_length': 'How long object trails persist on screen before fading.',
    'trail_style': 'Style of the trails: Simple lines or glowing effects.',
    'show_accretion_disk': 'When enabled, black holes display accretion disk effects.',
    'show_bh_glow': 'When enabled, black holes have a glowing effect.',
    'star_density': 'Number of background stars in the starfield.',
    
    // Initial conditions
    'placement': 'How objects are initially positioned: Random, Circular, or Empty.',
    'init_velocity': 'Initial velocity given to objects when they are created.',
    'velocity_stddev': 'Standard deviation of initial velocities, creating variation.',
    'orbit_decay_rate': 'How quickly orbits decay due to gravitational radiation.',
    
    // Scenario settings
    'preset_scenario': 'Choose from predefined scenarios with specific object configurations.',
    'sim_size': 'Overall scale of the simulation: Small, Medium, or Large.',
    
    // Additional settings
    'softening_length': 'Reduces numerical instabilities by softening gravity at very small distances.',
    'time_step': 'Controls simulation speed and precision. Smaller steps = more accuracy but slower performance.'
  };
  
  return tooltips[key] || `This setting controls ${label.toLowerCase()}.`;
};

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

  // Group settings into sections
  const sections = [];
  let currentSection = null;
  let currentSectionItems = [];

  setting_items.forEach(item => {
    if (item.type === 'separator') {
      // Save previous section if it exists
      if (currentSection && currentSectionItems.length > 0) {
        sections.push({
          title: currentSection,
          items: currentSectionItems
        });
      }
      // Start new section
      currentSection = item.label.replace(/^---\s*|\s*---$/g, '').trim();
      currentSectionItems = [];
    } else {
      currentSectionItems.push(item);
    }
  });

  // Add the last section
  if (currentSection && currentSectionItems.length > 0) {
    sections.push({
      title: currentSection,
      items: currentSectionItems
    });
  }

  // Create collapsible sections
  sections.forEach(section => {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'settings-section';
    
    // Create section header
    const headerDiv = document.createElement('div');
    headerDiv.className = 'settings-section-header';
    
    const titleDiv = document.createElement('h3');
    titleDiv.className = 'settings-section-title';
    titleDiv.textContent = section.title;
    
    const toggleDiv = document.createElement('div');
    toggleDiv.className = 'settings-section-toggle';
    toggleDiv.textContent = '▼';
    
    headerDiv.appendChild(titleDiv);
    headerDiv.appendChild(toggleDiv);
    
    // Create section content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'settings-section-content';
    
    // Create grid for this section
    const sectionGrid = document.createElement('div');
    sectionGrid.className = 'settings-grid';
    sectionGrid.style.display = 'grid';
    sectionGrid.style.gridTemplateColumns = '1fr 1fr';
    sectionGrid.style.gap = '25px 35px';
    sectionGrid.style.alignItems = 'center';

    // Add items to this section
    section.items.forEach(item => {
      // Create label container with info icon
      const labelContainer = document.createElement('div');
      labelContainer.className = 'setting-label-container';
      
      const label = document.createElement('div');
      label.className = 'setting-label';
      label.textContent = item.label;
      
      // Create info icon
      const infoIcon = document.createElement('button');
      infoIcon.className = 'setting-info-icon';
      infoIcon.textContent = 'ⓘ';
      infoIcon.setAttribute('aria-label', `Information about ${item.label}`);
      
      // Add click handler for tooltip using the new tooltip system
      infoIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const tooltipText = getSettingTooltip(item.key, item.label);
        tooltipManager.show(tooltipText, infoIcon, { position: 'bottom' });
      });
      
      // Add label and icon to container
      labelContainer.appendChild(label);
      labelContainer.appendChild(infoIcon);
      
      const controlContainer = document.createElement('div');
      controlContainer.className = 'setting-control';
      const value = localSettings[item.key];

      if (item.type === 'int' || item.type === 'float') {
        // Create a container for label + slider + value
        const sliderContainer = document.createElement('div');
        sliderContainer.style.display = 'flex';
        sliderContainer.style.flexDirection = 'column';
        sliderContainer.style.width = '100%';
        sliderContainer.style.gap = '4px';

        // Label above slider
        const sliderLabel = document.createElement('label');
        sliderLabel.textContent = item.label;
        sliderLabel.style.fontWeight = '500';
        sliderLabel.style.marginBottom = '2px';
        sliderLabel.style.fontSize = '15px';
        sliderLabel.style.letterSpacing = '0.01em';
        sliderLabel.style.color = 'rgba(224,224,224,0.95)';
        sliderLabel.style.textShadow = '0 1px 2px rgba(0,0,0,0.18)';
        sliderLabel.htmlFor = `${item.key}-slider`;

        // Slider and value display
        const sliderRow = document.createElement('div');
        sliderRow.style.display = 'flex';
        sliderRow.style.alignItems = 'center';
        sliderRow.style.gap = '12px';
        sliderRow.style.width = '100%';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = `${item.key}-slider`;
        slider.min = item.min;
        slider.max = item.max;
        slider.step = item.step;
        slider.value = value;
        slider.style.flex = '1 1 auto';
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
        sliderRow.append(slider, valueDisplay);
        sliderContainer.append(sliderLabel, sliderRow);
        controlContainer.append(sliderContainer);
      } else if (item.type === 'bool') {
        const button = document.createElement('button');
        button.className = 'toggle-button';
        button.textContent = value ? 'On' : 'Off';
        button.setAttribute('data-state', value ? 'on' : 'off');
        button.onclick = () => {
          localSettings[item.key] = !localSettings[item.key];
          const newState = localSettings[item.key];
          button.textContent = newState ? 'On' : 'Off';
          button.setAttribute('data-state', newState ? 'on' : 'off');
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

      sectionGrid.append(labelContainer, controlContainer);

      // Special handling for orbit decay rate button
      if (item.key === 'orbit_decay_rate') {
        const bhMassBtnContainer = document.createElement('div');
        bhMassBtnContainer.style.gridColumn = '1 / -1';
        bhMassBtnContainer.style.textAlign = 'center';
        bhMassBtnContainer.innerHTML = `<button id="indivBHMassBtn" class="ui-button" style="margin-top: 10px;">Set Individual BH Masses</button>`;
        sectionGrid.appendChild(bhMassBtnContainer);
        bhMassBtnContainer.firstElementChild.onclick = showIndivBHMassMenu;
      }
    });

    contentDiv.appendChild(sectionGrid);
    sectionDiv.appendChild(headerDiv);
    sectionDiv.appendChild(contentDiv);
    settingsGrid.appendChild(sectionDiv);

    // Add click handler for collapsible functionality
    headerDiv.addEventListener('click', () => {
      sectionDiv.classList.toggle('collapsed');
    });
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
      else if (type === 'NeutronStar') new_obj = new NeutronStar(pos, vel, null, null);
      else if (type === 'WhiteDwarf') new_obj = new WhiteDwarf(pos, vel);
      else if (type === 'Debris') new_obj = new Debris(pos, vel);
              else if (type === 'BlackHole') new_obj = new BlackHole(pos, mass, vel, true);
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
  const mobileSpeedDisplay = document.getElementById('mobileSpeedDisplay');
  if (speedDisplay) {
    speedDisplay.textContent = `${SETTINGS.sim_speed.toFixed(1)}x`;
  }
  if (mobileSpeedDisplay) {
    mobileSpeedDisplay.textContent = `${SETTINGS.sim_speed.toFixed(1)}x`;
  }
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
  { type: "Planet", emoji: "🌍", label: "Add Rocky Planets" },
  { type: "GasGiant", emoji: "🪐", label: "Add Gas Giants" },
  { type: "Asteroid", emoji: "☄️", label: "Add Asteroids" },
  { type: "Comet", emoji: "☄️", label: "Add Comets" },
  { type: "WhiteDwarf", emoji: "💎", label: "Add White Dwarfs" },
  { type: "NeutronStar", emoji: "⚡", label: "Add Neutron Stars" },
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
  const mobileBtn = document.getElementById('mobileObjectTypeBtn');
  if (!btn) return; // Guard against missing button
  const currentType = objectTypes[currentTypeIndex];
  btn.innerHTML = `${currentType.emoji} ${currentType.label}`;
  btn.title = `Click to change what type of object you insert (currently: ${currentType.type})`;
  if (mobileBtn) {
    mobileBtn.innerHTML = `${currentType.emoji} ${currentType.label}`;
    mobileBtn.title = `Click to change what type of object you insert (currently: ${currentType.type})`;
  }
  SETTINGS.input_object_type = currentType.type;
};

// Event handlers
canvas.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  
  // Mark that user has interacted with the page
  state.user_has_interacted = true;
  
  // Check if click is in UI area - improved detection with buffer zone
  const uiContainer = document.querySelector('.ui-container');
  const uiRect = uiContainer.getBoundingClientRect();
  const bufferZone = 5; // 5px buffer around UI elements
  
  // Check if click is within the UI container bounds (including buffer zone)
  if (e.clientX >= uiRect.left - bufferZone && e.clientX <= uiRect.right + bufferZone && 
      e.clientY >= uiRect.top - bufferZone && e.clientY <= uiRect.bottom + bufferZone) {
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
    // Validate world coordinates before proceeding
    if (isNaN(worldPos.x) || isNaN(worldPos.y) || 
        !isFinite(worldPos.x) || !isFinite(worldPos.y)) {
      console.warn('Invalid world coordinates:', worldPos);
      return;
    }
    
    state.adding_mass = true;
    state.add_start_screen = { x: e.clientX, y: e.clientY };
    state.add_start_world = worldPos;
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
    
    // Validate both start and end world coordinates
    if (isNaN(add_end_world.x) || isNaN(add_end_world.y) || 
        !isFinite(add_end_world.x) || !isFinite(add_end_world.y) ||
        isNaN(state.add_start_world.x) || isNaN(state.add_start_world.y) || 
        !isFinite(state.add_start_world.x) || !isFinite(state.add_start_world.y)) {
      console.warn('Invalid world coordinates during object placement:', {
        start: state.add_start_world,
        end: add_end_world
      });
      return;
    }
    
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
      new_obj = new NeutronStar(state.add_start_world, vel, null, null);
    else if (type === 'WhiteDwarf')
      new_obj = new WhiteDwarf(state.add_start_world, vel);
    else if (type === 'Comet')
      new_obj = new Comet(state.add_start_world, vel);
    else if (type === 'BlackHole') {
      const randomMass = generateRandomBlackHoleMass();
              new_obj = new BlackHole(state.add_start_world, randomMass, vel, true);
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

// Delete object functionality
const deleteSelectedObject = () => {
    if (state.selectedObject && state.selectedObject.object) {
        const object = state.selectedObject.object;
        const type = state.selectedObject.type;
        
        // Clear energy history for the object being deleted
        if (object.id) {
            clearObjectEnergyHistory(object.id);
            console.log(`Cleared energy history for deleted ${type}: ${object.id}`);
        }
        
        // Mark the object as dead so it gets removed in the next physics update
        object.alive = false;
        
        // Close the inspector
        hideObjectInspector();
        
        // Show a brief notification
        console.log(`Deleted ${type}: ${object.id}`);
    }
};

document.getElementById('inspectorDelete').onclick = deleteSelectedObject;


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

document.getElementById('objectTypeBtn').addEventListener('contextmenu', (e) => {
  e.preventDefault();
  currentTypeIndex = (currentTypeIndex - 1 + objectTypes.length) % objectTypes.length;
  updateObjectTypeButton();
});

// Mobile instructions close button
document.getElementById('closeMobileInstructions').onclick = () => {
  document.getElementById('mobileInstructions').style.display = 'none';
};
// Mobile menu functionality
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileMenuDropdown = document.getElementById('mobileMenuDropdown');
// Mobile menu toggle functionality
if (mobileMenuToggle && mobileMenuDropdown) {
  mobileMenuToggle.addEventListener('click', () => {
    mobileMenuToggle.classList.toggle('active');
    mobileMenuDropdown.classList.toggle('show');
  });

  // Close mobile menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!mobileMenuToggle.contains(e.target) && !mobileMenuDropdown.contains(e.target)) {
      mobileMenuToggle.classList.remove('active');
      mobileMenuDropdown.classList.remove('show');
    }
  });

  // Mobile button event listeners (mirror desktop functionality)
  document.getElementById('mobileSettingsBtn').onclick = () => {
    buildSettingsMenu();
    document.getElementById('settingsPanel').classList.remove('hidden');
    state.paused = true;
    // Close mobile menu after clicking
    mobileMenuToggle.classList.remove('active');
    mobileMenuDropdown.classList.remove('show');
  };

  document.getElementById('mobileRefreshScenarioBtn').onclick = () => {
    const currentScenario = current_scenario_name || 'Binary BH';
    SETTINGS.preset_scenario = currentScenario;
    initialize_simulation();
    state.paused = false;
    show_scenario_info();
    updateSpeedDisplay();
    // Close mobile menu after clicking
    mobileMenuToggle.classList.remove('active');
    mobileMenuDropdown.classList.remove('show');
  };

  document.getElementById('mobileResetAllBtn').onclick = () => {
    SETTINGS = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    SETTINGS.preset_scenario = 'Binary BH';
    initialize_simulation();
    state.paused = false;
    show_scenario_info();
    updateSpeedDisplay();
    // Close mobile menu after clicking
    mobileMenuToggle.classList.remove('active');
    mobileMenuDropdown.classList.remove('show');
  };

  document.getElementById('mobileSaveBtn').onclick = () => {
    save_simulation_state();
    // Close mobile menu after clicking
    mobileMenuToggle.classList.remove('active');
    mobileMenuDropdown.classList.remove('show');
  };

  document.getElementById('mobileLoadBtn').onclick = () => {
    load_simulation_state();
    // Close mobile menu after clicking
    mobileMenuToggle.classList.remove('active');
    mobileMenuDropdown.classList.remove('show');
  };

  document.getElementById('mobileScreenshotBtn').onclick = () => {
    takeScreenshot();
    // Close mobile menu after clicking
    mobileMenuToggle.classList.remove('active');
    mobileMenuDropdown.classList.remove('show');
  };

  document.getElementById('mobileCleanSimBtn').onclick = () => {
    // Clear all simulation objects and arrays
    bh_list.length = 0;
    planets.length = 0;
    stars.length = 0;
    gas_giants.length = 0;
    asteroids.length = 0;
    comets.length = 0;
    neutron_stars.length = 0;
    white_dwarfs.length = 0;
    debris.length = 0;
    particles.length = 0;
    gravity_ripples.length = 0;
    accretion_disk_particles.length = 0;
    particlePool.clear && particlePool.clear();
    resetPhysicsObjectCounter && resetPhysicsObjectCounter();

    // Reset view to default
    state.zoom = 1.0;
    state.pan = { x: 0.0, y: 0.0 };

    // Hide inspector and scenario info
    hideObjectInspector && hideObjectInspector();
    const scenarioInfoDiv = document.getElementById('scenarioInfoDisplay');
    if (scenarioInfoDiv) scenarioInfoDiv.classList.remove('visible');

    // Set scenario to 'None' and update settings
    SETTINGS.preset_scenario = 'None';
    current_scenario_name = 'None';

    // Unpause simulation and set normal speed
    state.paused = false;
    SETTINGS.sim_speed = 1.0;

    // Redraw background/starfield if needed
    if (typeof generateStarfield === 'function') generateStarfield();

    // Optionally update UI overlays
    if (typeof show_scenario_info === 'function') show_scenario_info();
    
    // Close mobile menu after clicking
    mobileMenuToggle.classList.remove('active');
    mobileMenuDropdown.classList.remove('show');
  };

  document.getElementById('mobileResetViewBtn').onclick = () => {
    // Use the same reset view logic as desktop
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
      
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      
      for (const obj of allObjects) {
        minX = Math.min(minX, obj.pos.x);
        maxX = Math.max(maxX, obj.pos.x);
        minY = Math.min(minY, obj.pos.y);
        maxY = Math.max(maxY, obj.pos.y);
      }
      
      const padding = 50;
      const width = maxX - minX + padding * 2;
      const height = maxY - minY + padding * 2;
      
      const zoomX = canvas.width / width;
      const zoomY = canvas.height / height;
      const newZoom = Math.min(zoomX, zoomY, 2.0);
      
      state.zoom = Math.max(0.1, newZoom);
      state.pan.x = -centerX * state.zoom;
      state.pan.y = centerY * state.zoom;
    } else {
      state.zoom = 1.0;
      state.pan = { x: 0.0, y: 0.0 };
    }
    // Close mobile menu after clicking
    mobileMenuToggle.classList.remove('active');
    mobileMenuDropdown.classList.remove('show');
  };

  // Mobile object type navigation
  document.getElementById('mobileObjectTypePrevBtn').onclick = () => {
    currentTypeIndex = (currentTypeIndex - 1 + objectTypes.length) % objectTypes.length;
    updateObjectTypeButton();
    // Keep mobile menu open for object type changes
  };

  document.getElementById('mobileObjectTypeBtn').onclick = () => {
    currentTypeIndex = (currentTypeIndex + 1) % objectTypes.length;
    updateObjectTypeButton();
    // Keep mobile menu open for object type changes
  };

  document.getElementById('mobileObjectTypeNextBtn').onclick = () => {
    currentTypeIndex = (currentTypeIndex + 1) % objectTypes.length;
    updateObjectTypeButton();
    // Keep mobile menu open for object type changes
  };

  document.getElementById('mobileLoadScenarioBtn').onclick = () => {
    // Use the same scenario loading logic as desktop
    const modal = document.getElementById('scenarioListModal');
    const itemsDiv = document.getElementById('scenarioListItems');
    itemsDiv.innerHTML = '';
    
    Object.entries(SCENARIO_INFO).forEach(([key, info], index) => {
      if (!info || typeof info !== 'object') {
        console.warn(`Invalid scenario data for key: ${key}`);
        return;
      }
      
      const title = info.title || 'Untitled Scenario';
      const summary = info.summary || 'No description available.';
      const category = info.category || 'General';
      
      const item = document.createElement('div');
      item.className = 'scenario-list-item';
      item.style.animationDelay = `${index * 0.1}s`;
      
      item.innerHTML = `
        <div class="scenario-title">
          <strong>${title}</strong>
          <span>${category}</span>
        </div>
        <hr class="scenario-separator">
        <div class="scenario-description">
          <span>${summary}</span>
        </div>
      `;
      
      item.onclick = () => {
        SETTINGS.preset_scenario = key;
        current_scenario_name = key;
        initialize_simulation();
        state.paused = false;
        modal.classList.add('hidden');
        show_enhanced_scenario_info(key);
        updateSpeedDisplay();
      };
      
      itemsDiv.appendChild(item);
    });
    
    modal.classList.remove('hidden');
    // Close mobile menu after clicking
    mobileMenuToggle.classList.remove('active');
    mobileMenuDropdown.classList.remove('show');
  };

  // Mobile speed controls
  document.getElementById('mobileSlowDownBtn').onclick = () => {
    SETTINGS.sim_speed = Math.max(0.1, SETTINGS.sim_speed - 0.2);
    updateSpeedDisplay();
  };

  document.getElementById('mobileSpeedUpBtn').onclick = () => {
    SETTINGS.sim_speed = Math.min(5.0, SETTINGS.sim_speed + 0.2);
    updateSpeedDisplay();
  };
}

// Scenario info box close button
const closeScenarioInfoBtn = document.getElementById('closeScenarioInfo');
if (closeScenarioInfoBtn) {
  // Add multiple event listeners to ensure it works
  closeScenarioInfoBtn.addEventListener('click', (e) => {
    console.log('Close scenario info button clicked');
    e.preventDefault();
    e.stopPropagation();
    const infoBox = document.getElementById('scenarioInfoBox');
    if (infoBox) {
      console.log('Removing showUI class from scenario info box');
      console.log('Before removal - classes:', infoBox.className);
      infoBox.classList.remove('showUI');
      infoBox.classList.remove('show'); // Also remove show class for compatibility
      console.log('After removal - classes:', infoBox.className);
    } else {
      console.error('Scenario info box element not found');
    }
  });
  
  // Also add mousedown event as backup
  closeScenarioInfoBtn.addEventListener('mousedown', (e) => {
    console.log('Close scenario info button mousedown');
    e.preventDefault();
    e.stopPropagation();
    const infoBox = document.getElementById('scenarioInfoBox');
    if (infoBox) {
      console.log('Removing showUI class from scenario info box (mousedown)');
      infoBox.classList.remove('showUI');
      infoBox.classList.remove('show'); // Also remove show class for compatibility
    }
  });
} else {
  console.error('Close scenario info button not found');
}

// Scenario list modal handlers
document.getElementById('loadScenarioBtn').onclick = () => {
  const modal = document.getElementById('scenarioListModal');
  const itemsDiv = document.getElementById('scenarioListItems');
  itemsDiv.innerHTML = '';
  
  // Build scenario list with validation
  Object.entries(SCENARIO_INFO).forEach(([key, info], index) => {
    // Validate scenario data
    if (!info || typeof info !== 'object') {
      console.warn(`Invalid scenario data for key: ${key}`);
      return;
    }
    
    // Ensure required properties exist with fallbacks
    const title = info.title || 'Untitled Scenario';
    const summary = info.summary || 'No description available.';
    const scenarioKey = key || 'unknown';
    
    const item = document.createElement('div');
    item.className = 'scenario-list-item';
    
    // Add staggered animation delay
    const delay = index * 50; // 50ms delay between each card
    item.style.animationDelay = `${delay}ms`;
    
    item.onclick = () => {
      SETTINGS.preset_scenario = key;
      initialize_simulation();
      modal.classList.add('hidden');
      show_scenario_info();
      updateSpeedDisplay();
    };
    
    // Sanitize HTML content to prevent XSS
    const sanitizeHTML = (str) => {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };
    
    item.innerHTML = `
      <div class="scenario-title">
        <strong>${sanitizeHTML(title)}</strong>
        <span>${sanitizeHTML(scenarioKey)}</span>
      </div>
      <hr class="scenario-separator">
      <div class="scenario-description">
        <span>${sanitizeHTML(summary)}</span>
      </div>
    `;
    
    itemsDiv.appendChild(item);
  });
  
  // Log generation results for debugging
  const generatedItems = itemsDiv.children.length;
  const totalScenarios = Object.keys(SCENARIO_INFO).length;
  console.log(`Generated ${generatedItems} scenario cards from ${totalScenarios} scenarios`);
  
  modal.classList.remove('hidden');
};

// Validation function for scenario data
const validateScenarioData = () => {
  const issues = [];
  
  Object.entries(SCENARIO_INFO).forEach(([key, info]) => {
    if (!info || typeof info !== 'object') {
      issues.push(`Invalid scenario object for key: ${key}`);
      return;
    }
    
    if (!info.title || typeof info.title !== 'string') {
      issues.push(`Missing or invalid title for scenario: ${key}`);
    }
    
    if (!info.summary || typeof info.summary !== 'string') {
      issues.push(`Missing or invalid summary for scenario: ${key}`);
    }
    
    if (info.title && info.title.length > 100) {
      issues.push(`Title too long for scenario: ${key} (${info.title.length} chars)`);
    }
    
    if (info.summary && info.summary.length > 500) {
      issues.push(`Summary too long for scenario: ${key} (${info.summary.length} chars)`);
    }
  });
  
  if (issues.length > 0) {
    console.warn('Scenario data validation issues:', issues);
  } else {
    console.log('All scenario data validated successfully');
  }
  
  return issues.length === 0;
};

// Run validation on page load
document.addEventListener('DOMContentLoaded', () => {
  validateScenarioData();
});

document.getElementById('closeScenarioList').onclick = () => {
  document.getElementById('scenarioListModal').classList.add('hidden');
};

document.getElementById('scenarioListModal').onclick = (e) => {
  if (e.target === document.getElementById('scenarioListModal')) {
    document.getElementById('scenarioListModal').classList.add('hidden');
  }
};

// Touch event handlers for mobile
canvas.addEventListener(
  'touchstart',
  e => {
    // Only call preventDefault if necessary (e.g., for custom drag/zoom)
    if (e.touches.length === 1) {
      e.preventDefault(); // Required to prevent scrolling during drag/zoom
    }
    const touchCount = e.touches.length;
    const touchStartTime = Date.now();

    // Mark that user has interacted with the page
    state.user_has_interacted = true;

    if (touchCount === 1) {
      const touch = e.touches[0];
      const touchStartPos = { x: touch.clientX, y: touch.clientY };
      
      // Check if touch is in UI area - improved detection with buffer zone
      const uiContainer = document.querySelector('.ui-container');
      const uiRect = uiContainer.getBoundingClientRect();
      const bufferZone = 5; // 5px buffer around UI elements
      
      // Check if touch is within the UI container bounds (including buffer zone)
      if (touchStartPos.x >= uiRect.left - bufferZone && touchStartPos.x <= uiRect.right + bufferZone && 
          touchStartPos.y >= uiRect.top - bufferZone && touchStartPos.y <= uiRect.bottom + bufferZone) {
        return;
      }
      
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
        // Validate world coordinates before proceeding
        if (isNaN(worldPos.x) || isNaN(worldPos.y) || 
            !isFinite(worldPos.x) || !isFinite(worldPos.y)) {
          console.warn('Invalid world coordinates:', worldPos);
          return;
        }
        
        state.adding_mass = true;
        state.add_start_screen = touchStartPos;
        state.add_start_world = worldPos;
      }
    }
  },
  { passive: false } // passive: false is required because we call preventDefault for custom drag/zoom
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
  { passive: true }
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
        
        // Validate both start and end world coordinates
        if (isNaN(add_end_world.x) || isNaN(add_end_world.y) || 
            !isFinite(add_end_world.x) || !isFinite(add_end_world.y) ||
            isNaN(state.add_start_world.x) || isNaN(state.add_start_world.y) || 
            !isFinite(state.add_start_world.x) || !isFinite(state.add_start_world.y)) {
          console.warn('Invalid world coordinates during touch object placement:', {
            start: state.add_start_world,
            end: add_end_world
          });
          return;
        }
        
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
          new_obj = new NeutronStar(state.add_start_world, vel, null, null);
        else if (type === 'WhiteDwarf')
          new_obj = new WhiteDwarf(state.add_start_world, vel);
        else if (type === 'Comet')
          new_obj = new Comet(state.add_start_world, vel);
        else if (type === 'BlackHole') {
          const randomMass = generateRandomBlackHoleMass();
          new_obj = new BlackHole(state.add_start_world, randomMass, vel, true);
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
  show_enhanced_scenario_info,
  apply_preset,
  initialize_simulation,
  buildSettingsMenu,
  save_simulation_state,
  load_simulation_state,
  updateSpeedDisplay,
  takeScreenshot,
  updateObjectTypeButton,
  setupOverlayMinimize,
  SETTINGS,
  state,
  current_scenario_name,
  DEFAULT_SETTINGS,
  localSettings,
};
// === Tutorial Popup Logic ===
(function() {
  const tutorialBtn = document.getElementById('tutorialBtn');
  const tutorialPopup = document.getElementById('tutorialPopup');
  const tutorialBody = document.getElementById('tutorialPopupBody');
  const tutorialPrev = document.getElementById('tutorialPrevBtn');
  const tutorialNext = document.getElementById('tutorialNextBtn');
  // Removed tutorialCloseBtn reference since we removed the X button

  if (!tutorialBtn || !tutorialPopup) return;

  // Tutorial steps: array of strings (more useful and practical)
  const steps = [
    "Welcome to Gravitas! This is your cosmic playground. You can create black holes, stars, planets, and watch them interact through gravity.",
    "Try clicking and dragging in empty space to add objects. The longer you drag, the faster they'll move. Use the object type button to switch between stars, planets, and black holes.",
    "Click any object to inspect it! The Object Inspector shows mass, velocity, and other properties. You can even edit some values to see how they affect the simulation.",
    "Load different scenarios from the menu to see pre-built cosmic systems. Each one demonstrates different physics - from binary stars to galactic centers.",
    "Use the speed controls to slow down or speed up time. The settings panel lets you adjust gravity, add more objects, and customize the simulation to your liking.",
    "That's it! Have fun exploring the universe! 🚀"
  ];
  let step = 0;

  // Map each step to a selector for the relevant UI element (null for no highlight)
  const stepHighlights = [
    null, // Welcome: no highlight
    '#simulationCanvas', // Navigation: canvas
    '#settingsBtn', // Settings: settings button
    '#loadScenarioBtn', // Preset scenarios: load scenario button
    '.ui-container' // Restart & Explore: main UI bar
  ];

  // Create overlay for dimming
  let tutorialOverlay = null;
  let highlightBox = null;

  function showHighlight(stepIdx) {
    removeHighlight();
    const selector = stepHighlights[stepIdx];
    if (!selector) return;
    const el = document.querySelector(selector);
    if (!el) return;
    // Create overlay
    tutorialOverlay = document.createElement('div');
    tutorialOverlay.style.position = 'fixed';
    tutorialOverlay.style.left = '0';
    tutorialOverlay.style.top = '0';
    tutorialOverlay.style.width = '100vw';
    tutorialOverlay.style.height = '100vh';
    tutorialOverlay.style.background = 'rgba(10,16,32,0.3)'; // Reduced opacity from 0.55 to 0.3
    tutorialOverlay.style.zIndex = '1003';
    tutorialOverlay.style.pointerEvents = 'none';
    document.body.appendChild(tutorialOverlay);
    // Create highlight box
    const rect = el.getBoundingClientRect();
    highlightBox = document.createElement('div');
    highlightBox.style.position = 'fixed';
    highlightBox.style.left = rect.left + 'px';
    highlightBox.style.top = rect.top + 'px';
    highlightBox.style.width = rect.width + 'px';
    highlightBox.style.height = rect.height + 'px';
    highlightBox.style.boxShadow = '0 0 0 4px #00e0ff, 0 0 24px 8px #00e0ff99';
    highlightBox.style.borderRadius = getComputedStyle(el).borderRadius || '10px';
    highlightBox.style.zIndex = '1004';
    highlightBox.style.pointerEvents = 'none';
    highlightBox.style.transition = 'all 0.2s';
    document.body.appendChild(highlightBox);
  }

  function removeHighlight() {
    if (tutorialOverlay) {
      tutorialOverlay.remove();
      tutorialOverlay = null;
    }
    if (highlightBox) {
      highlightBox.remove();
      highlightBox = null;
    }
  }

  function updateTutorial() {
    tutorialBody.textContent = steps[step];
    tutorialPrev.disabled = (step === 0);
    // Change Next button text to 'Finish' on last step
    tutorialNext.textContent = (step === steps.length - 1) ? 'Finish' : 'Next';
    showHighlight(step);
    setTimeout(() => tutorialPopup.focus(), 0);
  }

  function openTutorial() {
    tutorialPopup.style.display = 'block';
    step = 0;
    updateTutorial();
    tutorialPopup.setAttribute('tabindex', '-1');
    tutorialPopup.focus();
    document.body.style.overflow = 'hidden';
    // Responsive position
    if (window.innerWidth < 600) {
      tutorialPopup.style.left = '50%';
      tutorialPopup.style.bottom = '10vw';
      tutorialPopup.style.top = '';
      tutorialPopup.style.right = '';
      tutorialPopup.style.transform = 'translateX(-50%)';
    } else {
      tutorialPopup.style.left = '2vw';
      tutorialPopup.style.bottom = '8vw';
      tutorialPopup.style.top = '';
      tutorialPopup.style.right = '';
      tutorialPopup.style.transform = '';
    }
  }

  function closeTutorial() {
    tutorialPopup.style.display = 'none';
    document.body.style.overflow = '';
    tutorialBtn.focus();
    removeHighlight();
    // No longer setting localStorage since tutorial is manual only
  }

  // --- Draggable and swipe-to-dismiss tutorial popup ---
  let dragOffset = null;
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let popupStart = { left: 0, top: 0 };
  const popup = tutorialPopup;
  const header = popup.querySelector('.tutorial-popup-header');

  // Desktop drag
  if (header) {
    header.addEventListener('mousedown', (e) => {
      if (window.innerWidth < 700) return; // Only desktop
      isDragging = true;
      dragStart = { x: e.clientX, y: e.clientY };
      const rect = popup.getBoundingClientRect();
      popupStart = { left: rect.left, top: rect.top };
      document.body.style.userSelect = 'none';
    });
  }
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    let dx = e.clientX - dragStart.x;
    let dy = e.clientY - dragStart.y;
    let newLeft = popupStart.left + dx;
    let newTop = popupStart.top + dy;
    // Clamp to viewport
    newLeft = Math.max(8, Math.min(window.innerWidth - popup.offsetWidth - 8, newLeft));
    newTop = Math.max(8, Math.min(window.innerHeight - popup.offsetHeight - 8, newTop));
    popup.style.left = newLeft + 'px';
    popup.style.top = newTop + 'px';
    popup.style.right = '';
    popup.style.bottom = '';
    popup.style.transform = '';
  });
  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.userSelect = '';
    }
  });

  // Mobile swipe-to-dismiss
  let touchStartY = null;
  let touchMoved = false;
  popup.addEventListener('touchstart', (e) => {
    if (window.innerWidth >= 700) return;
    if (e.touches.length !== 1) return;
    touchStartY = e.touches[0].clientY;
    touchMoved = false;
  }, { passive: true });
  popup.addEventListener('touchmove', (e) => {
    if (window.innerWidth >= 700) return;
    if (touchStartY === null) return;
    const dy = e.touches[0].clientY - touchStartY;
    if (Math.abs(dy) > 10) touchMoved = true;
    if (touchMoved) {
      popup.style.transform = `translateY(${dy}px)`;
    }
  }, { passive: true });
  popup.addEventListener('touchend', (e) => {
    if (window.innerWidth >= 700) return;
    if (!touchMoved) {
      popup.style.transform = '';
      touchStartY = null;
      return;
    }
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dy) > 80) {
      closeTutorial();
      popup.style.transform = '';
    } else {
      popup.style.transform = '';
    }
    touchStartY = null;
    touchMoved = false;
  });

  // Event listeners
  tutorialBtn.addEventListener('click', openTutorial);
  // Removed tutorialClose event listener since we removed the X button
  tutorialPrev.addEventListener('click', () => {
    if (step > 0) {
      step--;
      updateTutorial();
    }
  });
  tutorialNext.addEventListener('click', () => {
    if (step < steps.length - 1) {
      step++;
      updateTutorial();
    } else {
      closeTutorial();
    }
  });
  tutorialPopup.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeTutorial();
    } else if (e.key === 'ArrowLeft') {
      if (step > 0) { step--; updateTutorial(); }
    } else if (e.key === 'ArrowRight') {
      if (step < steps.length - 1) { step++; updateTutorial(); }
    }
  });
  document.addEventListener('mousedown', (e) => {
    if (tutorialPopup.style.display === 'block' && !tutorialPopup.contains(e.target) && e.target !== tutorialBtn) {
      closeTutorial();
    }
  });

  // --- Tutorial is now manual only - no auto-show ---
  // Users can access tutorial via the Tutorial button only
})();

// Remove the duplicate functions that were outside the IIFE
// ... existing code ...

// Helper: Ensure no two objects are initialized within a minimum separation distance
function ensureMinSeparation(objects, candidate, minDist) {
  // objects: array of {x, y, radius}
  // candidate: {x, y, radius}
  // minDist: minimum allowed center-to-center distance
  for (let obj of objects) {
    const dx = obj.x - candidate.x;
    const dy = obj.y - candidate.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) return false;
  }
  return true;
}

// Helper: Place an object with minimum separation, retrying up to maxTries
function placeWithSeparation(objects, createCandidate, minDist, maxTries = 30) {
  for (let i = 0; i < maxTries; i++) {
    const candidate = createCandidate();
    if (ensureMinSeparation(objects, candidate, minDist)) {
      return candidate;
    }
  }
  // If no valid position found, return null
  return null;
}

document.addEventListener('DOMContentLoaded', () => {
  const cleanSimBtn = document.getElementById('cleanSimBtn');
  if (cleanSimBtn) {
    cleanSimBtn.onclick = () => {
      // Clear all simulation objects and arrays
      bh_list.length = 0;
      planets.length = 0;
      stars.length = 0;
      gas_giants.length = 0;
      asteroids.length = 0;
      comets.length = 0;
      neutron_stars.length = 0;
      white_dwarfs.length = 0;
      debris.length = 0;
      particles.length = 0;
      gravity_ripples.length = 0;
      accretion_disk_particles.length = 0;
      particlePool.clear && particlePool.clear();
      resetPhysicsObjectCounter && resetPhysicsObjectCounter();

      // Reset view to default
      state.zoom = 1.0;
      state.pan = { x: 0.0, y: 0.0 };

      // Hide inspector and scenario info
      hideObjectInspector && hideObjectInspector();
      const scenarioInfoDiv = document.getElementById('scenarioInfoDisplay');
      if (scenarioInfoDiv) scenarioInfoDiv.classList.remove('visible');

      // Set scenario to 'None' and update settings
      SETTINGS.preset_scenario = 'None';
      current_scenario_name = 'None';

      // Unpause simulation and set normal speed
      state.paused = false;
      SETTINGS.sim_speed = 1.0;

      // Redraw background/starfield if needed
      if (typeof generateStarfield === 'function') generateStarfield();

      // Optionally update UI overlays
      if (typeof show_scenario_info === 'function') show_scenario_info();
    };
  }
});