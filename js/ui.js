// UI and event handling functions

import { screen_to_world, bh_list, planets, stars, gas_giants, asteroids, debris, particles, gravity_ripples, neutron_stars, white_dwarfs, PhysicsObject_id_counter, resetPhysicsObjectCounter, setPhysicsObjectCounter, SOLAR_MASS_UNIT, Planet, GasGiant, Asteroid, StarObject, BlackHole, Debris, NeutronStar, WhiteDwarf, updatePhysicsSettings, setStateReference } from './physics.js';

const canvas = document.getElementById('simulationCanvas');
const starfieldCanvas = document.getElementById('starfieldCanvas');

// Global state object
const state = {
    zoom: 1.0,
    pan: { x: 0.0, y: 0.0 },
    paused: false,
    mouse: { x: 0, y: 0, down: false },
    adding_mass: false,
    add_start_screen: { x: 0, y: 0 },
    add_start_world: { x: 0, y: 0 },
    inspector_open: false,
    touch_active: false,
    touch_id: null,
    last_time: 0,
    frame_count: 0
};

// Set the state reference in physics.js to ensure single source of truth
setStateReference(state);

// Global variables
const SAVE_KEY = "gravitas_simulation_save";

const DEFAULT_SETTINGS = {
    preset_scenario: "Binary BH", 
    gravitational_constant: 2.0,  
    follow_mode: "None",       
    num_planets: 15, num_gas_giants: 2, num_neutron_stars: 0, num_white_dwarfs: 0,
    init_velocity: 20, velocity_stddev: 5,
    bh_mass: 10, num_black_holes: 1, bh_behavior: "Static", use_individual_bh_masses: false,
    bh_masses: [], orbit_decay_rate: 0.005, placement: "Random", 
    mutual_gravity: false,
    show_trails: true,
    sim_speed: 1.0,
    show_velocity_vectors: false, interactive_add: true, trail_length: 15,
    trail_style: "Glow",
    sim_size: "Large", 
    star_density: 10000,
    input_object_type: "Star", show_bh_glow: true,
    show_accretion_disk: true, show_bh_jets: false, improved_lensing: true, lensing_strength: 100,
    show_dynamic_overlays: true, enable_asteroids: true, num_asteroids: 10,
    dynamic_object_properties: true, record_simulation: false, 
    show_ambient_lighting: true,
    planet_base_color: "#6495ed", 
    star_base_color: "#ffff00",
    enable_star_merging: true,
    max_star_mass_before_bh: 20.0,  
};

let SETTINGS = { ...DEFAULT_SETTINGS };
let localSettings = {};

let current_scenario_name = null;

// Expanded scenario information
const SCENARIO_INFO = {
    "Binary BH": {
        title:"Binary Black Hole", 
        summary:"Two stellar-mass black holes (15 & 10 M☉) locked in mutual orbit. Watch as they spiral together, creating gravitational waves and eventually merging into a single, more massive black hole. Perfect for studying orbital dynamics and merger events."
    },
    "Triple BH System": {
        title:"Triple Black Hole",  
        summary:"A chaotic three-body dance of massive black holes (20, 15, & 10 M☉) in a complex orbital arrangement. This unstable configuration will eventually eject one black hole while the remaining two merge. Demonstrates the chaotic nature of multi-body gravitational systems."
    },
    "Supermassive BH": {
        title:"Supermassive Core",  
        summary:"One enormous black hole (80 M☉) dominates a dense stellar swarm with 50 planets, 5 gas giants, and 100 asteroids. The intense gravitational field creates spectacular accretion disks and tidal disruption events. Similar to the environment around real supermassive black holes in galactic centers."
    },
    "Star Cluster": {
        title:"Dense Star Cluster", 
        summary:"Hundreds of stars (100 planets, 10 gas giants, 200 asteroids) with gentle mutual gravity in a black hole-free environment. Watch as stars interact, potentially forming binary systems or experiencing close encounters. Represents a young open cluster or globular cluster core."
    },
    "Kuiper Belt": {
        title:"Kuiper Belt",        
        summary:"A sun-like star with outer-system objects including 8 planets, 4 gas giants, and 300 asteroids in distant orbits. The system mimics our Solar System's Kuiper Belt region, with icy bodies and dwarf planets orbiting far from the central star."
    },
    "Sagittarius A*": {
        title:"Sagittarius A*",     
        summary:"The Milky Way's central supermassive black hole (1000 M☉) with 200 stars, 10 gas giants, and 50 asteroids in chaotic orbits. Extreme gravitational lensing and tidal forces create a dynamic environment similar to our galaxy's center."
    },
    "Binary Star System": {
        title:"Binary Stars",       
        summary:"A pair of suns in mutual orbit with 5 planets orbiting the binary system. The complex gravitational environment creates interesting orbital dynamics and potential habitable zones. Similar to real binary star systems like Alpha Centauri."
    },
    "Slingshot": {
        title:"Gravity Slingshot",  
        summary:"Use a heavy black hole (50 M☉) to fling lighter bodies across the system. A smaller black hole (2 M☉) approaches at high velocity, creating dramatic gravitational assists. Demonstrates the slingshot effect used by spacecraft to gain velocity from planetary encounters."
    },
    "Rogue Encounter": {
        title:"Rogue Encounter",    
        summary:"A wandering black hole (25 M☉) grazes a stable planetary system with 8 planets and 2 gas giants. Watch as the rogue black hole disrupts orbits, potentially ejecting planets or creating new orbital configurations. Shows the chaos that can occur when massive objects pass through planetary systems."
    },
    "Neutron Star Collision": {
        title:"Neutron Star Merger",
        summary:"Two neutron stars (1.4 M☉ each) spiral toward each other in a death dance. This rare event produces gravitational waves, gamma-ray bursts, and creates heavy elements through r-process nucleosynthesis. Based on the LIGO-detected GW170817 event."
    },
    "Pulsar System": {
        title:"Pulsar with Planets",
        summary:"A rapidly spinning neutron star with 3 planets in tight orbits. The pulsar's intense magnetic field and radiation create a harsh environment. Based on the first confirmed exoplanets discovered around PSR B1257+12."
    },
    "White Dwarf Binary": {
        title:"White Dwarf Binary",
        summary:"Two white dwarf stars in a close binary system with accretion between them. One star gradually steals material from its companion, potentially leading to a Type Ia supernova. Includes debris disk and stellar remnants."
    },
    "Stellar Graveyard": {
        title:"Stellar Graveyard",
        summary:"A collection of stellar remnants: white dwarfs, neutron stars, and black holes with debris from ancient stellar explosions. This represents the final fate of a once-active star-forming region after billions of years of evolution."
    },
    "Galactic Center": {
        title:"Galactic Center",
        summary:"A supermassive black hole (4000 M☉) surrounded by a diverse population of stellar objects including main sequence stars, giants, white dwarfs, and neutron stars. Represents the extreme environment at the center of a galaxy."
    },
    "Supernova Remnant": {
        title:"Supernova Remnant",
        summary:"The aftermath of a massive star explosion: a neutron star or black hole surrounded by expanding debris, nearby shocked stars, and a disrupted planetary system. Shows the violent death of massive stars and their impact on surrounding space."
    },
    "Compact Object Zoo": {
        title:"Compact Object Zoo",
        summary:"A diverse collection of compact objects: multiple black holes, neutron stars, and white dwarfs of various masses interacting in a dense environment. Perfect for studying the different types of stellar endpoints and their interactions."
    },
    "Millisecond Pulsar": {
        title:"Millisecond Pulsar",
        summary:"An extremely fast-spinning neutron star (recycled pulsar) with a white dwarf companion and planetary debris. These 'recycled' pulsars are spun up by accretion and are among the most precise timekeepers in the universe."
    },
    "Tidal Disruption Event": {
        title:"Tidal Disruption",
        summary:"A star approaches too close to a supermassive black hole and is torn apart by tidal forces. Half the stellar material is ejected while the other half forms an accretion disk, creating a bright flare observable from great distances."
    },
    "Intermediate Mass BH": {
        title:"Intermediate Mass BH",
        summary:"A rare intermediate-mass black hole (400 M☉) in a globular cluster environment with dense stellar populations. These elusive objects bridge the gap between stellar-mass and supermassive black holes."
    },
    "Galactic Collision": {
        title:"Galactic Collision", 
        summary:"Two super-massive black holes (1000 & 800 M☉) with thousands of stars on a collision course. Watch as the massive gravitational forces disrupt stellar orbits and create spectacular tidal streams during this cosmic catastrophe."
    },
    "Micro BH Swarm": {
        title:"Micro BH Swarm",     
        summary:"Dozens of tiny primordial black holes (0.5-2 M☉) interacting chaotically in a dense swarm. These hypothetical objects from the early universe create complex gravitational dynamics and potential merger events."
    },
    "Exoplanet Lab": {
        title:"Exoplanet Lab",      
        summary:"A sun-like star with 100+ varied planets for detailed observation and study. This laboratory setup allows you to experiment with different planetary configurations and observe long-term orbital evolution."
    }
};

// Object inspection functions - updated to include new objects
const findObjectAtPosition = (worldPos) => {
    // Check black holes first
    for (const bh of bh_list) {
        const dx = worldPos.x - bh.pos.x;
        const dy = worldPos.y - bh.pos.y;
        const clickRadius = Math.max(bh.radius, 10 / state.zoom);
        if (dx*dx + dy*dy < clickRadius*clickRadius) {
            return { object: bh, type: 'BlackHole' };
        }
    }
    
    // Check neutron stars
    for (const ns of neutron_stars) {
        if (!ns.alive) continue;
        const dx = worldPos.x - ns.pos.x;
        const dy = worldPos.y - ns.pos.y;
        const clickRadius = Math.max(ns.radius, 6 / state.zoom);
        if (dx*dx + dy*dy < clickRadius*clickRadius) {
            return { object: ns, type: 'NeutronStar' };
        }
    }
    
    // Check white dwarfs
    for (const wd of white_dwarfs) {
        if (!wd.alive) continue;
        const dx = worldPos.x - wd.pos.x;
        const dy = worldPos.y - wd.pos.y;
        const clickRadius = Math.max(wd.radius, 8 / state.zoom);
        if (dx*dx + dy*dy < clickRadius*clickRadius) {
            return { object: wd, type: 'WhiteDwarf' };
        }
    }
    
    // Check stars
    for (const star of stars) {
        if (!star.alive) continue;
        const dx = worldPos.x - star.pos.x;
        const dy = worldPos.y - star.pos.y;
        const clickRadius = Math.max(star.radius, 8 / state.zoom);
        if (dx*dx + dy*dy < clickRadius*clickRadius) {
            return { object: star, type: 'Star' };
        }
    }
    
    // Check gas giants
    for (const gasGiant of gas_giants) {
        if (!gasGiant.alive) continue;
        const dx = worldPos.x - gasGiant.pos.x;
        const dy = worldPos.y - gasGiant.pos.y;
        const clickRadius = Math.max(gasGiant.radius, 8 / state.zoom);
        if (dx*dx + dy*dy < clickRadius*clickRadius) {
            return { object: gasGiant, type: 'GasGiant' };
        }
    }
    
    // Check planets
    for (const planet of planets) {
        if (!planet.alive) continue;
        const dx = worldPos.x - planet.pos.x;
        const dy = worldPos.y - planet.pos.y;
        const clickRadius = Math.max(planet.radius, 6 / state.zoom);
        if (dx*dx + dy*dy < clickRadius*clickRadius) {
            return { object: planet, type: 'Planet' };
        }
    }
    
    // Check asteroids
    for (const asteroid of asteroids) {
        if (!asteroid.alive) continue;
        const dx = worldPos.x - asteroid.pos.x;
        const dy = worldPos.y - asteroid.pos.y;
        const clickRadius = Math.max(asteroid.radius, 4 / state.zoom);
        if (dx*dx + dy*dy < clickRadius*clickRadius) {
            return { object: asteroid, type: 'Asteroid' };
        }
    }
    
    return null;
};

const getBlackHoleInfo = (bh) => {
    const massInSuns = bh.mass / SOLAR_MASS_UNIT;
    return {
        icon: '⚫',
        title: 'Black Hole',
        stats: [
            { label: 'Mass', value: `${massInSuns.toFixed(2)} M☉` },
            { label: 'Position', value: `(${bh.pos.x.toFixed(1)}, ${bh.pos.y.toFixed(1)})` },
            { label: 'Velocity', value: `${Math.hypot(bh.vel.x, bh.vel.y).toFixed(1)} units/s` }
        ],
        description: `A black hole with ${massInSuns.toFixed(2)} solar masses.`
    };
};

const getStarInfo = (star) => {
    const massInSuns = star.massInSuns || (star.mass / SOLAR_MASS_UNIT);
    return {
        icon: '⭐',
        title: 'Star',
        stats: [
            { label: 'Mass', value: `${massInSuns.toFixed(2)} M☉` },
            { label: 'Position', value: `(${star.pos.x.toFixed(1)}, ${star.pos.y.toFixed(1)})` },
            { label: 'Velocity', value: `${Math.hypot(star.vel.x, star.vel.y).toFixed(1)} units/s` }
        ],
        description: `A star with ${massInSuns.toFixed(2)} solar masses.`
    };
};

const getPlanetInfo = (planet) => {
    return {
        icon: '🪐',
        title: 'Planet',
        stats: [
            { label: 'Mass', value: `${planet.massInEarths?.toFixed(2) || planet.mass.toFixed(2)} M⊕` },
            { label: 'Position', value: `(${planet.pos.x.toFixed(1)}, ${planet.pos.y.toFixed(1)})` },
            { label: 'Velocity', value: `${Math.hypot(planet.vel.x, planet.vel.y).toFixed(1)} units/s` }
        ],
        description: `A rocky planet with ${planet.massInEarths?.toFixed(2) || planet.mass.toFixed(2)} Earth masses.`
    };
};

const getGasGiantInfo = (gasGiant) => {
    return {
        icon: '🪐',
        title: 'Gas Giant',
        stats: [
            { label: 'Mass', value: `${gasGiant.massInJupiters?.toFixed(2) || gasGiant.mass.toFixed(2)} M♃` },
            { label: 'Position', value: `(${gasGiant.pos.x.toFixed(1)}, ${gasGiant.pos.y.toFixed(1)})` },
            { label: 'Velocity', value: `${Math.hypot(gasGiant.vel.x, gasGiant.vel.y).toFixed(1)} units/s` }
        ],
        description: `A gas giant with ${gasGiant.massInJupiters?.toFixed(2) || gasGiant.mass.toFixed(2)} Jupiter masses.`
    };
};

const getAsteroidInfo = (asteroid) => {
    return {
        icon: '☄️',
        title: 'Asteroid',
        stats: [
            { label: 'Mass', value: `${asteroid.mass.toFixed(2)} units` },
            { label: 'Position', value: `(${asteroid.pos.x.toFixed(1)}, ${asteroid.pos.y.toFixed(1)})` },
            { label: 'Velocity', value: `${Math.hypot(asteroid.vel.x, asteroid.vel.y).toFixed(1)} units/s` }
        ],
        description: `A small rocky body with ${asteroid.mass.toFixed(2)} mass units.`
    };
};

const getNeutronStarInfo = (ns) => {
    const massInSuns = ns.massInSuns || (ns.mass / SOLAR_MASS_UNIT);
    return {
        icon: '🌟',
        title: 'Neutron Star',
        stats: [
            { label: 'Mass', value: `${massInSuns.toFixed(2)} M☉` },
            { label: 'Position', value: `(${ns.pos.x.toFixed(1)}, ${ns.pos.y.toFixed(1)})` },
            { label: 'Velocity', value: `${Math.hypot(ns.vel.x, ns.vel.y).toFixed(1)} units/s` },
            { label: 'Radius', value: `${ns.radius.toFixed(1)} km` }
        ],
        description: `An ultra-dense neutron star with ${massInSuns.toFixed(2)} solar masses compressed into a city-sized sphere.`
    };
};

const getWhiteDwarfInfo = (wd) => {
    const massInSuns = wd.massInSuns || (wd.mass / SOLAR_MASS_UNIT);
    return {
        icon: '🤍',
        title: 'White Dwarf',
        stats: [
            { label: 'Mass', value: `${massInSuns.toFixed(2)} M☉` },
            { label: 'Position', value: `(${wd.pos.x.toFixed(1)}, ${wd.pos.y.toFixed(1)})` },
            { label: 'Velocity', value: `${Math.hypot(wd.vel.x, wd.vel.y).toFixed(1)} units/s` },
            { label: 'Temperature', value: `${wd.temperature || 5000}K` }
        ],
        description: `A white dwarf star with ${massInSuns.toFixed(2)} solar masses - the hot, dense core of a dead star.`
    };
};

const showObjectInspector = (object, type) => {
    const inspector = document.getElementById('objectInspector');
    
    const updateInspector = () => {
        let info;
        switch(type) {
            case 'BlackHole': info = getBlackHoleInfo(object); break;
            case 'Star': info = getStarInfo(object); break;
            case 'Planet': info = getPlanetInfo(object); break;
            case 'GasGiant': info = getGasGiantInfo(object); break;
            case 'Asteroid': info = getAsteroidInfo(object); break;
            case 'NeutronStar': info = getNeutronStarInfo(object); break;
            case 'WhiteDwarf': info = getWhiteDwarfInfo(object); break;
            default: return;
        }
        
        document.getElementById('inspectorTitle').innerHTML = `${info.icon} ${info.title}`;
        
        const content = document.getElementById('inspectorContent');
        content.innerHTML = `
            <div class="inspector-description">${info.description}</div>
            <div class="inspector-stats">
                ${info.stats.map(stat => `
                    <div class="stat-row">
                        <span class="stat-label">${stat.label}:</span>
                        <span class="stat-value">${stat.value}</span>
                    </div>
                `).join('')}
            </div>
        `;
    };
    
    updateInspector();
    inspector.style.display = 'block';
    state.inspector_open = true;
    
    // Update inspector periodically while open
    const updateInterval = setInterval(() => {
        if (!state.inspector_open || !object.alive) {
            clearInterval(updateInterval);
            if (!object.alive) hideObjectInspector();
            return;
        }
        updateInspector();
    }, 100);
};

const hideObjectInspector = () => {
    const inspector = document.getElementById('objectInspector');
    inspector.style.display = 'none';
    state.inspector_open = false;
};

const show_scenario_info = () => {
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

const apply_preset = (settings_dict) => {
    const ps = settings_dict.preset_scenario;
    if (ps === "None") return;
    const fresh_defaults = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    Object.assign(settings_dict, fresh_defaults, { preset_scenario: ps });

    if (ps === "Binary BH") { 
        Object.assign(settings_dict, { 
            num_black_holes: 2, bh_behavior: "Orbiting", use_individual_bh_masses: true, 
            bh_masses: [15, 10], num_planets: 10, num_gas_giants: 2, init_velocity: 20, 
            velocity_stddev: 5, placement: "Random", mutual_gravity: false, show_trails: true, 
            sim_speed: 1.0, show_velocity_vectors: false, interactive_add: true, trail_length: 15,
            trail_style: "Glow", sim_size: "Large", star_density: 10000, input_object_type: "Star", 
            show_bh_glow: true, show_accretion_disk: true, show_bh_jets: false, improved_lensing: true, 
            lensing_strength: 100, show_dynamic_overlays: true, enable_asteroids: true, num_asteroids: 10,
            dynamic_object_properties: true, record_simulation: false, show_ambient_lighting: true,
            planet_base_color: "#6495ed", star_base_color: "#ffff00", enable_star_merging: true,
            max_star_mass_before_bh: 20.0
        }); 
    }
    else if (ps === "Neutron Star Collision") {
        Object.assign(settings_dict, {
            num_black_holes: 0, num_neutron_stars: 2, bh_behavior: "Orbiting",
            num_planets: 5, num_gas_giants: 1, num_asteroids: 20,
            placement: "Circular", init_velocity: 30, mutual_gravity: true,
            show_trails: true, trail_length: 50
        });
    }
    else if (ps === "Pulsar System") {
        Object.assign(settings_dict, {
            num_black_holes: 0, num_neutron_stars: 1, num_planets: 3,
            num_gas_giants: 0, num_asteroids: 15, placement: "Circular",
            init_velocity: 40, mutual_gravity: true
        });
    }
    else if (ps === "White Dwarf Binary") {
        Object.assign(settings_dict, {
            num_black_holes: 0, num_white_dwarfs: 2, num_planets: 0,
            num_gas_giants: 0, num_asteroids: 30, placement: "Circular",
            init_velocity: 25, mutual_gravity: true
        });
    }
    else if (ps === "Stellar Graveyard") {
        Object.assign(settings_dict, {
            num_black_holes: 2, num_neutron_stars: 3, num_white_dwarfs: 5,
            num_planets: 0, num_gas_giants: 0, num_asteroids: 100,
            placement: "Random", init_velocity: 15, mutual_gravity: true
        });
    }
    else if (ps === "Galactic Center") {
        Object.assign(settings_dict, {
            num_black_holes: 1, bh_mass: 4000, num_neutron_stars: 5, num_white_dwarfs: 10,
            num_planets: 20, num_gas_giants: 5, num_asteroids: 50,
            placement: "Multi-Ring", init_velocity: 50, show_accretion_disk: true
        });
    }
    else if (ps === "Supernova Remnant") {
        Object.assign(settings_dict, {
            num_black_holes: 0, num_neutron_stars: 1, num_white_dwarfs: 0,
            num_planets: 3, num_gas_giants: 1, num_asteroids: 80,
            placement: "Random", init_velocity: 35, mutual_gravity: true
        });
    }
    else if (ps === "Compact Object Zoo") {
        Object.assign(settings_dict, {
            num_black_holes: 3, num_neutron_stars: 4, num_white_dwarfs: 6,
            num_planets: 10, num_gas_giants: 3, num_asteroids: 40,
            placement: "Random", init_velocity: 20, mutual_gravity: true
        });
    }
    else if (ps === "Millisecond Pulsar") {
        Object.assign(settings_dict, {
            num_black_holes: 0, num_neutron_stars: 1, num_white_dwarfs: 1,
            num_planets: 2, num_gas_giants: 0, num_asteroids: 25,
            placement: "Circular", init_velocity: 45, mutual_gravity: true
        });
    }
    else if (ps === "Tidal Disruption Event") {
        Object.assign(settings_dict, {
            num_black_holes: 1, bh_mass: 1000, num_neutron_stars: 0, num_white_dwarfs: 0,
            num_planets: 1, num_gas_giants: 0, num_asteroids: 0,
            placement: "Empty", init_velocity: 60, show_accretion_disk: true
        });
    }
    else if (ps === "Intermediate Mass BH") {
        Object.assign(settings_dict, {
            num_black_holes: 1, bh_mass: 400, num_neutron_stars: 2, num_white_dwarfs: 8,
            num_planets: 30, num_gas_giants: 5, num_asteroids: 60,
            placement: "Multi-Ring", init_velocity: 40, show_accretion_disk: true
        });
    }
    else if (ps === "Galactic Collision") {
        Object.assign(settings_dict, {
            num_black_holes: 2, bh_mass: 900, bh_behavior: "Orbiting",
            use_individual_bh_masses: true, bh_masses: [1000, 800],
            num_planets: 200, num_gas_giants: 20, num_asteroids: 500,
            num_neutron_stars: 8, num_white_dwarfs: 12,
            placement: "Multi-Ring", mutual_gravity: true,
            show_accretion_disk: true, show_bh_glow: true, show_bh_jets: true,
            orbit_decay_rate: 0.008
        });
    }
    else if (ps === "Micro BH Swarm") {
        Object.assign(settings_dict, {
            num_black_holes: 8, bh_mass: 1.2, bh_behavior: "Static",
            use_individual_bh_masses: true, 
            bh_masses: [0.5, 0.8, 1.0, 1.2, 1.5, 1.8, 2.0, 1.3],
            num_planets: 30, num_gas_giants: 5, num_asteroids: 100,
            placement: "Random", mutual_gravity: true,
            show_accretion_disk: false, show_bh_glow: true
        });
    }
    else if (ps === "Exoplanet Lab") {
        Object.assign(settings_dict, {
            num_black_holes: 0,
            num_planets: 100, num_gas_giants: 15, num_asteroids: 200,
            num_neutron_stars: 0, num_white_dwarfs: 0,
            placement: "Multi-Ring", mutual_gravity: false,
            show_accretion_disk: false, show_bh_glow: false,
            gravitational_constant: 1.5
        });
    }
    else if (ps === "Triple BH System") { 
        Object.assign(settings_dict, { 
            num_black_holes: 3, bh_behavior: "Orbiting", use_individual_bh_masses: true, 
            bh_masses: [20, 15, 10], num_planets: 20, num_asteroids: 40, placement: "Circular", 
            init_velocity: 10, orbit_decay_rate: 0.001 
        }); 
    }
    else if (ps === "Supermassive BH") { 
        Object.assign(settings_dict, { 
            num_black_holes: 1, bh_mass: 80, num_planets: 50, num_gas_giants: 5, num_asteroids: 100, 
            init_velocity: 25, show_accretion_disk: true 
        }); 
    }
    else if (ps === "Star Cluster") { 
        Object.assign(settings_dict, { 
            num_black_holes: 0, num_planets: 100, num_gas_giants: 10, num_asteroids: 200, 
            placement: "Grid", init_velocity: 5, gravitational_constant: 1.0 
        }); 
    }
    else if (ps === "Kuiper Belt") { 
        Object.assign(settings_dict, { 
            placement: "Empty", mutual_gravity: true, num_black_holes: 0, num_planets: 8, 
            num_gas_giants: 4, enable_asteroids: true, num_asteroids: 300 
        }); 
    }
    else if (ps === "Sagittarius A*") { 
        Object.assign(settings_dict, { 
            num_black_holes: 1, bh_mass: 1000, bh_behavior: "Static", show_accretion_disk: true, 
            show_bh_glow: true, num_planets: 200, num_gas_giants: 10, num_asteroids: 50, 
            placement: "Random", init_velocity: 60, velocity_stddev: 20 
        }); 
    }
    else if (ps === "Binary Star System") { 
        Object.assign(settings_dict, { 
            num_black_holes: 0, mutual_gravity: true, placement: "Empty", num_planets: 5 
        }); 
    }
    else if (ps === "Slingshot") { 
        Object.assign(settings_dict, { 
            placement: "Empty", num_black_holes: 2, use_individual_bh_masses: true, 
            bh_masses: [50, 2], bh_behavior: "Orbiting", num_planets: 15 
        }); 
    }
    else if (ps === "Rogue Encounter") { 
        Object.assign(settings_dict, { 
            placement: "Empty", num_black_holes: 1, bh_mass: 25, mutual_gravity: true, 
            num_planets: 8, num_gas_giants: 2 
        }); 
    }

    settings_dict.preset_scenario = "None";
};

const apply_placement = () => {
    const placement = SETTINGS.placement;
    const sim_size = SETTINGS.sim_size;
    
    // Get simulation bounds based on sim_size - reduced for better visibility
    let bounds;
    switch (sim_size) {
        case "Small": bounds = 100; break;   // was 200
        case "Medium": bounds = 200; break;  // was 400
        case "Large": bounds = 300; break;   // was 800
        case "Huge": bounds = 500; break;    // was 1200
        default: bounds = 300;
    }
    
    // Get all objects that need positioning (excluding central stars)
    const all_objects = [...bh_list, ...planets, ...gas_giants, ...asteroids, ...neutron_stars, ...white_dwarfs];
    
    // Skip placement for Empty preset
    if (placement === "Empty") return;
    
    switch (placement) {
        case "Random":
            all_objects.forEach(obj => {
                // Random position within bounds
                const angle = Math.random() * 2 * Math.PI;
                const radius = Math.random() * bounds;
                obj.pos.x = Math.cos(angle) * radius;
                obj.pos.y = Math.sin(angle) * radius;
                
                // Random velocity
                const vel_angle = Math.random() * 2 * Math.PI;
                const vel_mag = (Math.random() - 0.5) * SETTINGS.init_velocity + 
                               (Math.random() - 0.5) * SETTINGS.velocity_stddev;
                obj.vel.x = Math.cos(vel_angle) * vel_mag;
                obj.vel.y = Math.sin(vel_angle) * vel_mag;
            });
            break;
            
        case "Circular":
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
            
        case "Multi-Ring":
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
            
        case "Grid":
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
    
    // Special positioning for various scenarios
    if (current_scenario_name === "Neutron Star Collision" && neutron_stars.length >= 2) {
        neutron_stars[0].pos.x = -50;
        neutron_stars[0].pos.y = 0;
        neutron_stars[0].vel.x = 0;
        neutron_stars[0].vel.y = 15;
        
        neutron_stars[1].pos.x = 50;
        neutron_stars[1].pos.y = 0;
        neutron_stars[1].vel.x = 0;
        neutron_stars[1].vel.y = -15;
    }
    
    if (current_scenario_name === "White Dwarf Binary" && white_dwarfs.length >= 2) {
        white_dwarfs[0].pos.x = -80;
        white_dwarfs[0].pos.y = 0;
        white_dwarfs[0].vel.x = 0;
        white_dwarfs[0].vel.y = 20;
        
        white_dwarfs[1].pos.x = 80;
        white_dwarfs[1].pos.y = 0;
        white_dwarfs[1].vel.x = 0;
        white_dwarfs[1].vel.y = -20;
    }
    
    if (current_scenario_name === "Tidal Disruption Event" && bh_list.length >= 1 && planets.length >= 1) {
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
            case "Binary BH":
                if (bh_list.length >= 2) {
                    bh_list[0].pos.x = -100;
                    bh_list[0].pos.y = 0;
                    bh_list[0].vel.x = 0;
                    bh_list[0].vel.y = 20;
                    
                    bh_list[1].pos.x = 100;
                    bh_list[1].pos.y = 0;
                    bh_list[1].vel.x = 0;
                    bh_list[1].vel.y = -20;
                }
                break;
                
            case "Triple BH System":
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
                
            case "Slingshot":
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

const initialize_simulation = () => {
    const starting_preset = SETTINGS.preset_scenario;
    apply_preset(SETTINGS);
    current_scenario_name = starting_preset;

    // Update physics settings
    updatePhysicsSettings(SETTINGS);

    state.zoom = 1.5;  // Increased from 1.0 for better initial framing
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
    resetPhysicsObjectCounter();

    // Add central stars for specific presets
    if (["Kuiper Belt", "Rogue Encounter"].includes(starting_preset)) {
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
            bh_list.push(new BlackHole({ x: 0, y: 0 }, SETTINGS.bh_mass * SOLAR_MASS_UNIT));
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
    {"label": "Preset Scenario", "key": "preset_scenario", "type": "option", "options": ["None", "Binary BH", "Triple BH System", "Supermassive BH", "Star Cluster", "Kuiper Belt", "Sagittarius A*", "Binary Star System", "Slingshot","Rogue Encounter", "Neutron Star Collision", "Pulsar System", "White Dwarf Binary", "Stellar Graveyard", "Galactic Center", "Supernova Remnant", "Compact Object Zoo", "Millisecond Pulsar", "Tidal Disruption Event", "Intermediate Mass BH", "Galactic Collision", "Micro BH Swarm", "Exoplanet Lab"]},
    {"label": "--- Simulation ---", "type": "separator"},
    {"label": "Gravitational Constant", "key": "gravitational_constant", "type": "float", "min": 0.1, "max": 20.0, "step": 0.1},
    {"label": "Mutual Gravity (All)", "key": "mutual_gravity", "type": "bool"},
    {"label": "Simulation Speed", "key": "sim_speed", "type": "float", "min": 0.0, "max": 5.0, "step": 0.1},
    {"label": "Simulation Size", "key": "sim_size", "type": "option", "options": ["Small", "Medium", "Large", "Huge"]},
    {"label": "Placement", "key": "placement", "type": "option", "options": ["Circular", "Multi-Ring", "Random", "Grid", "Empty"]},
    {"label": "--- Black Holes ---", "type": "separator"},
    {"label": "Number of Black Holes", "key": "num_black_holes", "type": "int", "min": 0, "max": 10, "step": 1},
    {"label": "Default BH Mass (Msun)", "key": "bh_mass", "type": "float", "min": 0.1, "max": 1000, "step": 0.5},
    {"label": "Use Individual BH Masses", "key": "use_individual_bh_masses", "type": "bool"},
    {"label": "BH Behavior", "key": "bh_behavior", "type": "option", "options": ["Static", "Orbiting"]},
    {"label": "Orbit Decay Rate", "key": "orbit_decay_rate", "type": "float", "min": 0.0, "max": 0.1, "step": 0.001, "precision": 3},
    {"label": "--- Compact Objects ---", "type": "separator"},
    {"label": "Number of Neutron Stars", "key": "num_neutron_stars", "type": "int", "min": 0, "max": 20, "step": 1},
    {"label": "Number of White Dwarfs", "key": "num_white_dwarfs", "type": "int", "min": 0, "max": 30, "step": 1},
    {"label": "--- Objects ---", "type": "separator"},
    {"label": "Number of Planets", "key": "num_planets", "type": "int", "min": 0, "max": 200, "step": 1},
    {"label": "Number of Gas Giants", "key": "num_gas_giants", "type": "int", "min": 0, "max": 50, "step": 1},
    {"label": "Enable Asteroids", "key": "enable_asteroids", "type": "bool"},
    {"label": "Number of Asteroids", "key": "num_asteroids", "type": "int", "min": 0, "max": 500, "step": 5},
    {"label": "Initial Velocity", "key": "init_velocity", "type": "float", "min": 0, "max": 100, "step": 1},
    {"label": "Velocity StdDev", "key": "velocity_stddev", "type": "float", "min": 0, "max": 50, "step": 1},
    {"label": "Input Object Type", "key": "input_object_type", "type": "option", "options": ["Planet", "Star", "Asteroid", "GasGiant", "NeutronStar", "WhiteDwarf"]},
    {"label": "--- Visuals ---", "type": "separator"},
    {"label": "Show Trails", "key": "show_trails", "type": "bool"},
    {"label": "Trail Style", "key": "trail_style", "type": "option", "options": ["Cloud", "Simple", "Glow"]},
    {"label": "Trail Length", "key": "trail_length", "type": "int", "min": 5, "max": 300, "step": 5},
    {"label": "Show Velocity Vectors", "key": "show_velocity_vectors", "type": "bool"},
    {"label": "Show BH Glow", "key": "show_bh_glow", "type": "bool"},
    {"label": "Show Accretion Disk", "key": "show_accretion_disk", "type": "bool"},
    {"label": "Show BH Jets", "key": "show_bh_jets", "type": "bool"},
    {"label": "Improved Lensing", "key": "improved_lensing", "type": "bool"},
    {"label": "Lensing Strength", "key": "lensing_strength", "type": "float", "min": 1, "max": 1000, "step": 10},
    {"label": "Star Field Density", "key": "star_density", "type": "int", "min": 0, "max": 30000, "step": 100},
    {"label": "Ambient Lighting", "key": "show_ambient_lighting", "type": "bool"},
    {"label": "Dynamic Object Colors", "key": "dynamic_object_properties", "type": "bool"},
    {"label": "Planet Base Color", "key": "planet_base_color", "type": "color"},
    {"label": "Star Base Color", "key": "star_base_color", "type": "color"},
    {"label": "--- UI & Control ---", "type": "separator"},
    {"label": "Interactive Add", "key": "interactive_add", "type": "bool"},
    {"label": "Follow Mode", "key": "follow_mode", "type": "option", "options": ["None", "BlackHole", "Planet", "GasGiant", "Star", "NeutronStar", "WhiteDwarf"]},
    {"label": "Show Overlays", "key": "show_dynamic_overlays", "type": "bool"},
    {"label": "Record Simulation", "key": "record_simulation", "type": "bool"},
];

const buildSettingsMenu = () => {
    const settingsGrid = document.getElementById('settingsGrid');
    settingsGrid.innerHTML = '';
    localSettings = JSON.parse(JSON.stringify(SETTINGS)); 

    function updatePresetInfo(presetName){
        const box = document.getElementById("presetInfo");
        const info = SCENARIO_INFO[presetName];
        if(!info || presetName === "None"){ 
            box.innerHTML=""; 
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
            valueDisplay.textContent = Number(value).toFixed(item.precision || (item.type === 'float' ? 1 : 0));
            slider.oninput = () => {
                const val = item.type === 'int' ? parseInt(slider.value) : parseFloat(slider.value);
                localSettings[item.key] = val; 
                valueDisplay.textContent = val.toFixed(item.precision || (item.type === 'float' ? 1 : 0));
            };
            controlContainer.append(slider, valueDisplay);
        } else if (item.type === 'bool') {
            const button = document.createElement('button'); 
            button.className = 'toggle-button'; 
            button.textContent = value ? 'On' : 'Off';
            button.onclick = () => { 
                localSettings[item.key] = !localSettings[item.key]; 
                button.textContent = localSettings[item.key] ? 'On' : 'Off';
                
                // Special handling for individual BH masses
                if (item.key === 'use_individual_bh_masses' && localSettings[item.key]) {
                    showBHMassesModal();
                }
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
            select.onchange = (e) => {
                localSettings[item.key] = e.target.value;
                if (item.key === 'preset_scenario') {
                    updatePresetInfo(e.target.value);
                    current_scenario_name = e.target.value;
                    show_scenario_info();
                }
            };
            controlContainer.appendChild(select);
        } else if (item.type === 'color') {
            const colorInput = document.createElement('input'); 
            colorInput.type = 'color'; 
            colorInput.value = value;
            colorInput.oninput = () => { localSettings[item.key] = colorInput.value; };
            controlContainer.appendChild(colorInput);
        }

        settingsGrid.append(label, controlContainer);
    });
    
    updatePresetInfo(localSettings.preset_scenario);
};

// BH Masses Modal functionality
const showBHMassesModal = () => {
    const modal = document.getElementById('bhMassesModal');
    const content = document.getElementById('bhMassesContent');
    
    // Initialize bh_masses array if not exists
    if (!localSettings.bh_masses || localSettings.bh_masses.length === 0) {
        localSettings.bh_masses = Array(localSettings.num_black_holes || 1).fill(localSettings.bh_mass || 10);
    }
    
    // Adjust array size to match number of black holes
    while (localSettings.bh_masses.length < localSettings.num_black_holes) {
        localSettings.bh_masses.push(localSettings.bh_mass || 10);
    }
    localSettings.bh_masses = localSettings.bh_masses.slice(0, localSettings.num_black_holes);
    
    content.innerHTML = '';
    
    for (let i = 0; i < localSettings.num_black_holes; i++) {
        const massDiv = document.createElement('div');
        massDiv.className = 'bh-mass-item';
        
        const label = document.createElement('label');
        label.textContent = `Black Hole ${i + 1}:`;
        
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0.1';
        input.max = '10000';
        input.step = '0.1';
        input.value = localSettings.bh_masses[i] || localSettings.bh_mass || 10;
        input.oninput = () => {
            localSettings.bh_masses[i] = parseFloat(input.value);
        };
        
        massDiv.appendChild(label);
        massDiv.appendChild(input);
        content.appendChild(massDiv);
    }
    
    modal.classList.remove('hidden');
};

const hideBHMassesModal = () => {
    document.getElementById('bhMassesModal').classList.add('hidden');
};

// Save/Load functions
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
                ...debris.map(o => o.get_state()) 
            ] 
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(savedState));
        alert("Simulation state saved!");
    } catch (e) { 
        console.error("Error saving state:", e); 
        alert("Failed to save simulation state."); 
    }
};

const load_simulation_state = () => {
    const scenarioInfoDiv = document.getElementById('scenarioInfoDisplay');
    scenarioInfoDiv.classList.remove('visible');

    const savedJSON = localStorage.getItem(SAVE_KEY);
    if (!savedJSON) { 
        alert("No saved state found."); 
        return; 
    }
    try {
        const loadedState = JSON.parse(savedJSON);
        SETTINGS = loadedState.settings || { ...DEFAULT_SETTINGS };
        const view = loadedState.view || { zoom: 1.5, pan: {x:0, y:0} };
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
        alert("Simulation state loaded!"); 
        state.paused = false;
        updateSpeedDisplay();
    } catch (e) { 
        console.error("Error loading state:", e); 
        alert("Failed to load state."); 
    }
};

// Utility functions
const updateSpeedDisplay = () => {
    const speedDisplay = document.getElementById('speedDisplay');
    speedDisplay.textContent = `${SETTINGS.sim_speed.toFixed(1)}x`;
};

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

// Event handlers
canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const uiContainer = document.querySelector('.ui-container');
    if (e.clientX > uiContainer.getBoundingClientRect().left) return;
    
    const worldPos = screen_to_world({ x: e.clientX, y: e.clientY });
    const clickedObject = findObjectAtPosition(worldPos);
    
    if (clickedObject && !state.inspector_open) {
        showObjectInspector(clickedObject.object, clickedObject.type);
        return;
    }
    
    if (state.inspector_open && !clickedObject) {
        hideObjectInspector();
        return;
    }
    
    state.mouse.down = true;
    if (SETTINGS.interactive_add) {
        state.adding_mass = true;
        state.add_start_screen = { x: e.clientX, y: e.clientY };
        state.add_start_world = screen_to_world(state.add_start_screen);
    }
});

window.addEventListener('mousemove', (e) => {
    state.mouse.x = e.clientX; 
    state.mouse.y = e.clientY;
    if (state.mouse.down && !state.adding_mass) { 
        state.pan.x += e.movementX; 
        state.pan.y += e.movementY; 
    }
});

window.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return;
    state.mouse.down = false;
    if (state.adding_mass) {
        state.adding_mass = false;
        const add_end_world = screen_to_world({ x: e.clientX, y: e.clientY });
        const vel = { 
            x: (add_end_world.x - state.add_start_world.x) * 3, 
            y: (add_end_world.y - state.add_start_world.y) * 3 
        };
        const type = SETTINGS.input_object_type; 
        let new_obj;
        if (type === 'Planet') new_obj = new Planet(state.add_start_world, vel);
        else if (type === 'Star') new_obj = new StarObject(state.add_start_world, vel);
        else if (type === 'Asteroid') new_obj = new Asteroid(state.add_start_world, vel);
        else if (type === 'GasGiant') new_obj = new GasGiant(state.add_start_world, vel);
        else if (type === 'NeutronStar') new_obj = new NeutronStar(state.add_start_world, vel);
        else if (type === 'WhiteDwarf') new_obj = new WhiteDwarf(state.add_start_world, vel);
        
        if(new_obj instanceof Planet) planets.push(new_obj);
        if(new_obj instanceof StarObject) stars.push(new_obj);
        if(new_obj instanceof Asteroid) asteroids.push(new_obj);
        if(new_obj instanceof GasGiant) gas_giants.push(new_obj);
        if(new_obj instanceof NeutronStar) neutron_stars.push(new_obj);
        if(new_obj instanceof WhiteDwarf) white_dwarfs.push(new_obj);
    }
});

window.addEventListener('wheel', (e) => {
    if (e.target !== canvas) return;
    e.preventDefault(); 
    const zoomFactor = 1.1; 
    const oldZoom = state.zoom;
    let newZoom = (e.deltaY < 0) ? oldZoom * zoomFactor : oldZoom / zoomFactor;
    newZoom = Math.max(0.01, Math.min(newZoom, 100));
    const worldPos = screen_to_world({x: e.clientX, y: e.clientY});
    state.zoom = newZoom;
    const newScreenPos = { 
        x: worldPos.x * state.zoom + canvas.width / 2, 
        y: -worldPos.y * state.zoom + canvas.height / 2 
    };
    state.pan.x -= (newScreenPos.x - e.clientX);
    state.pan.y -= (newScreenPos.y - e.clientY);
}, { passive: false });

window.addEventListener('keydown', (e) => {
    const panSpeed = 40 / state.zoom;
    if (e.key === ' ') { 
        state.paused = !state.paused; 
        e.preventDefault(); 
    } 
    else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') state.pan.x += panSpeed;
    else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') state.pan.x -= panSpeed;
    else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') state.pan.y += panSpeed;
    else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') state.pan.y -= panSpeed;
    else if (e.key.toLowerCase() === 'home') { 
        state.zoom = 1.5;  // Match the improved initial zoom level
        state.pan = {x: 0, y: 0}; 
    }
    else if (e.key === '-' || e.key === '_') { 
        SETTINGS.sim_speed = Math.max(0.1, SETTINGS.sim_speed - 0.2);
        updateSpeedDisplay();
    }
    else if (e.key === '=' || e.key === '+') { 
        SETTINGS.sim_speed = Math.min(5.0, SETTINGS.sim_speed + 0.2);
        updateSpeedDisplay();
    }
    else if (e.key.toLowerCase() === 'p') {
        takeScreenshot();
    }
    else if (e.key === 'Escape') {
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
    initialize_simulation(); 
    state.paused = false; 
    show_scenario_info(); 
    updateSpeedDisplay(); 
};
document.getElementById('resetAllBtn').onclick = () => { 
    SETTINGS = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); 
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

// Reset view functionality
document.getElementById('resetViewBtn').onclick = () => {
    state.zoom = 1.5;  // Match the improved initial zoom level
    state.pan = { x: 0.0, y: 0.0 };
};

// Screenshot functionality
document.getElementById('screenshotBtn').onclick = takeScreenshot;

// Object type cycling functionality
const objectTypes = [
    { type: "Star", emoji: "⭐", label: "Add Stars" },
    { type: "Planet", emoji: "🪐", label: "Add Planets" },
    { type: "GasGiant", emoji: "🪐", label: "Add Gas Giants" },
    { type: "Asteroid", emoji: "☄️", label: "Add Asteroids" },
    { type: "NeutronStar", emoji: "🌟", label: "Add Neutron Stars" },
    { type: "WhiteDwarf", emoji: "🤍", label: "Add White Dwarfs" }
];

let currentTypeIndex = 0;

const updateObjectTypeButton = () => {
    const btn = document.getElementById('objectTypeBtn');
    const currentType = objectTypes[currentTypeIndex];
    btn.innerHTML = `${currentType.emoji} ${currentType.label}`;
    btn.title = `Click to change what type of object you insert (currently: ${currentType.type})`;
    SETTINGS.input_object_type = currentType.type;
};

document.getElementById('objectTypeBtn').onclick = () => {
    currentTypeIndex = (currentTypeIndex + 1) % objectTypes.length;
    updateObjectTypeButton();
};

// Mobile touch controls
let touchStartTime = 0;
let touchStartPos = { x: 0, y: 0 };
let touchCount = 0;
let lastTouchDistance = 0;

// Check if on mobile device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Show mobile instructions on first visit if on mobile
if (isMobile && !localStorage.getItem('mobile_instructions_shown')) {
    setTimeout(() => {
        document.getElementById('mobileInstructions').style.display = 'block';
        localStorage.setItem('mobile_instructions_shown', 'true');
    }, 2000);
}

// Mobile instructions close button
document.getElementById('closeMobileInstructions').onclick = () => {
    document.getElementById('mobileInstructions').style.display = 'none';
};

// Touch event handlers
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchCount = e.touches.length;
    touchStartTime = Date.now();
    
    if (touchCount === 1) {
        const touch = e.touches[0];
        touchStartPos = { x: touch.clientX, y: touch.clientY };
        state.touch_active = true;
        state.touch_id = touch.identifier;
        
        // Check for object interaction
        const worldPos = screen_to_world(touchStartPos);
        const clickedObject = findObjectAtPosition(worldPos);
        
        if (clickedObject && !state.inspector_open) {
            showObjectInspector(clickedObject.object, clickedObject.type);
            return;
        }
        
        if (state.inspector_open && !clickedObject) {
            hideObjectInspector();
            return;
        }
        
        if (SETTINGS.interactive_add) {
            state.adding_mass = true;
            state.add_start_screen = touchStartPos;
            state.add_start_world = worldPos;
        }
    } else if (touchCount === 2) {
        // Pinch zoom setup
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        lastTouchDistance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) + 
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    
    if (touchCount === 1 && state.touch_active) {
        const touch = e.touches[0];
        const currentPos = { x: touch.clientX, y: touch.clientY };
        
        if (!state.adding_mass) {
            // Pan the view
            state.pan.x += currentPos.x - touchStartPos.x;
            state.pan.y += currentPos.y - touchStartPos.y;
        }
        
        touchStartPos = currentPos;
    } else if (touchCount === 2) {
        // Pinch zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) + 
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        
        if (lastTouchDistance > 0) {
            const zoomFactor = currentDistance / lastTouchDistance;
            const oldZoom = state.zoom;
            let newZoom = oldZoom * zoomFactor;
            newZoom = Math.max(0.01, Math.min(newZoom, 100));
            
            // Zoom towards the center of the two touches
            const centerX = (touch1.clientX + touch2.clientX) / 2;
            const centerY = (touch1.clientY + touch2.clientY) / 2;
            const worldPos = screen_to_world({x: centerX, y: centerY});
            
            state.zoom = newZoom;
            const newScreenPos = { 
                x: worldPos.x * state.zoom + canvas.width / 2, 
                y: -worldPos.y * state.zoom + canvas.height / 2 
            };
            state.pan.x -= (newScreenPos.x - centerX);
            state.pan.y -= (newScreenPos.y - centerY);
        }
        
        lastTouchDistance = currentDistance;
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const touchDuration = Date.now() - touchStartTime;
    
    if (touchCount === 1 && state.touch_active) {
        if (state.adding_mass) {
            // Add object with velocity
            const touch = e.changedTouches[0];
            const add_end_world = screen_to_world({ x: touch.clientX, y: touch.clientY });
            const vel = { 
                x: (add_end_world.x - state.add_start_world.x) * 3, 
                y: (add_end_world.y - state.add_start_world.y) * 3 
            };
            const type = SETTINGS.input_object_type; 
            let new_obj;
            if (type === 'Planet') new_obj = new Planet(state.add_start_world, vel);
            else if (type === 'Star') new_obj = new StarObject(state.add_start_world, vel);
            else if (type === 'Asteroid') new_obj = new Asteroid(state.add_start_world, vel);
            else if (type === 'GasGiant') new_obj = new GasGiant(state.add_start_world, vel);
            else if (type === 'NeutronStar') new_obj = new NeutronStar(state.add_start_world, vel);
            else if (type === 'WhiteDwarf') new_obj = new WhiteDwarf(state.add_start_world, vel);
            
            if(new_obj instanceof Planet) planets.push(new_obj);
            if(new_obj instanceof StarObject) stars.push(new_obj);
            if(new_obj instanceof Asteroid) asteroids.push(new_obj);
            if(new_obj instanceof GasGiant) gas_giants.push(new_obj);
            if(new_obj instanceof NeutronStar) neutron_stars.push(new_obj);
            if(new_obj instanceof WhiteDwarf) white_dwarfs.push(new_obj);
            
            state.adding_mass = false;
        } else if (touchDuration < 300) {
            // Double tap to reset view
            const timeSinceLastTap = Date.now() - (window.lastTapTime || 0);
            if (timeSinceLastTap < 300) {
                state.zoom = 1.5;  // Match the improved initial zoom level
                state.pan = { x: 0, y: 0 };
            }
            window.lastTapTime = Date.now();
        }
    }
    
    touchCount = Math.max(0, touchCount - 1);
    if (touchCount === 0) {
        state.touch_active = false;
        state.touch_id = null;
    }
}, { passive: false });

// Initialization will be handled by main.js

// Export functions and variables
export {
    findObjectAtPosition, showObjectInspector, hideObjectInspector,
    getBlackHoleInfo, getStarInfo, getPlanetInfo, getGasGiantInfo, getAsteroidInfo,
    getNeutronStarInfo, getWhiteDwarfInfo, showBHMassesModal, hideBHMassesModal,
    show_scenario_info, apply_preset, initialize_simulation, buildSettingsMenu,
    save_simulation_state, load_simulation_state, updateSpeedDisplay, takeScreenshot,
    updateObjectTypeButton,
    SETTINGS, state, current_scenario_name, DEFAULT_SETTINGS, localSettings
}; 