// =============================================================================
// Scenario catalogue — titles and descriptions for the scenario picker
// -----------------------------------------------------------------------------
// Pure data, extracted from ui.js.
// =============================================================================

export const SCENARIO_INFO = {
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
  "Kepler's 2nd Law": {
    title: "Kepler's 2nd Law — Equal Areas",
    summary:
      'A planet in a nearly circular orbit and an eccentric orbiter around a central star. The area sweep visualization starts automatically for the eccentric body — watch how the wedges change shape but maintain equal area, showing why objects move faster at periapsis than at apoapsis.',
  },
  GW150914: {
    title: 'GW150914: First Gravitational Wave Merger',
    summary:
      'Simulates the historic merger of two massive black holes (36 & 29 M☉) detected by LIGO in 2015. Watch as they spiral together, emit gravitational waves, and merge into a single, more massive black hole.',
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
    summary:
      'A supermassive black hole is actively feeding on a dense star cluster. Watch a beam of light form as stars spiral inward.',
  },
  'The Pinwheel Galaxy Core': {
    title: 'The Pinwheel Galaxy Core',
    summary:
      'Two intermediate black holes in the center of a stellar disk. The disk forms a rotating pinwheel pattern as stars are slung around.',
  },
  'Star Frisbee': {
    title: 'Star Frisbee',
    summary:
      'A dense stellar disk thrown past a rogue black hole. Will it be shredded or survive the flyby?',
  },
  'Kessler Cascade': {
    title: 'Kessler Cascade',
    summary:
      'Hundreds of micro‑stars orbiting chaotically, colliding and ejecting like a debris cloud.',
  },
  'Alien Dyson Swarm Collapse': {
    title: 'Alien Dyson Swarm Collapse',
    summary:
      'A hypothetical Dyson swarm of artificial satellites falls into a black hole after a catastrophic orbital failure.',
  },
  'Tidal Arm Tango': {
    title: 'Tidal Arm Tango',
    summary:
      'Two black holes dance past each other, flinging stars into massive tidal arms like colliding galaxies.',
  },
  'Hungry Hungry Holes': {
    title: 'Hungry Hungry Holes',
    summary:
      'Four black holes at the corners of a square, pulling stars from a shared central cluster.',
  },
  'Slingshot Gauntlet': {
    title: 'Slingshot Gauntlet',
    summary:
      'A fast-moving star fired through a black hole obstacle course. Watch gravitational slingshots.',
  },
  'Black Hole Billiards': {
    title: 'Black Hole Billiards',
    summary:
      'A few small black holes orbiting a supermassive one, perturbing each other and creating chaotic motion.',
  },
  'Stellar Nursery': {
    title: 'Stellar Nursery',
    summary:
      'A dense cluster of young stars around a proto-black hole. Watch interactions and ejections as the cluster evolves.',
  },
};

export default SCENARIO_INFO;
