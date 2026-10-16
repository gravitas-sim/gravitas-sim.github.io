// =============================================================================
// The Settings panel's help, one entry per row of js/settingsSchema.js
// -----------------------------------------------------------------------------
// Fetched on the first press of an info button, and only in the reader's
// language (js/ui.js, loadSettingsHelp). It was in the deferred catalogs, which
// every lesson route downloads in both languages for the lesson panel's words:
// a hundred paragraphs nobody on a lesson was reading.
// tests/settingsInventory.test.js holds both files to the panel.
// =============================================================================

export const EN_SETTINGSHELP = {
  'setHelp.gravitational_constant':
    "Sets G in the app's own units (1 length unit = 0.01 AU, 1 M☉ = 1000 mass units); the default is 2, not the SI value. Raising it makes every body move faster on screen, and the physical-unit readouts absorb it by letting each simulated time unit stand for more real time. Takes effect at once, but bodies keep their current speeds, so orbits laid out for the old value stop being circular.",
  'setHelp.mutual_gravity':
    'On: every body pulls on every other, except comets and debris, which never attract anything. Off: planets and asteroids feel gravity but exert none, while black holes, stars, gas giants, neutron stars and white dwarfs still pull. Takes effect at once, and approximate gravity (Barnes-Hut) only runs with this on.',
  'setHelp.sim_speed':
    'How much simulated time passes per real second: at 1×, about 5 time units, roughly 13 days at the default G; 0 freezes the motion. The integration step grows with the speed, so high speeds are less accurate unless the scenario caps its step. Takes effect at once; the speed buttons change the same value.',
  'setHelp.sim_size':
    'Sets the size of the region the generator lays bodies out in: Small 100 units (1 AU), Medium 200 (2 AU), Large 300 (3 AU), Huge 500 (5 AU). A very heavy central body widens it so that nothing starts inside it. Takes effect when Apply & Restart rebuilds the simulation.',
  'setHelp.placement':
    'How the generator lays out bodies around the most massive star or compact object, which starts at rest at the center. Circular and Multi-Ring put them on rings (20 per ring for Multi-Ring) at circular-orbit speed; Random scatters them, orbiting the center if it outweighs the rest threefold and otherwise with random velocities; Grid sets them on a square grid with small random velocities; Empty lays nothing out: it is for bodies placed by hand, so set the counts to zero first, or every generated body starts together at the center. Takes effect when Apply & Restart rebuilds the simulation.',
  'setHelp.num_black_holes':
    'How many black holes the generator creates, each with the default black-hole mass unless individual masses are set. Every body is attracted to them; whether they move is set by BH Behavior. Takes effect when Apply & Restart rebuilds the simulation.',
  'setHelp.bh_mass':
    'Mass of each generated black hole, in solar masses (M☉). It is used for every hole unless individual masses are on and have been set, and for any hole beyond the ones set. Takes effect when Apply & Restart rebuilds the simulation.',
  'setHelp.use_individual_bh_masses':
    'Gives each black hole its own mass, set with the individual-masses button that appears when there are two or more holes. Until masses are set there, every hole uses the default mass. Takes effect when Apply & Restart rebuilds the simulation.',
  'setHelp.bh_behavior':
    "Static pins every black hole in place (a newly merged hole may drift briefly). Orbiting lets the holes move under each other's gravity, with Orbit Decay Rate applied; stars, planets and other bodies never pull on a black hole. Takes effect at once.",
  'setHelp.orbit_decay_rate':
    "A simple stand-in for gravitational-wave inspiral: each step, a moving black hole's velocity is reduced by this fraction per simulated time unit, so black-hole pairs spiral together. It is not computed from general relativity, acts only on black holes set to Orbiting, and removes energy, which the conservation check reports. Takes effect at once.",
  'setHelp.num_neutron_stars':
    'How many neutron stars the generator creates, each 1.4 to 2.0 M☉ unless the scenario sets their masses. They always attract other bodies. Takes effect when Apply & Restart rebuilds the simulation.',
  'setHelp.num_white_dwarfs':
    'How many white dwarfs the generator creates, each 0.5 to 1.1 M☉. They always attract other bodies. Takes effect when Apply & Restart rebuilds the simulation.',
  'setHelp.num_stars':
    'How many stars the generator creates, with random masses from about 0.2 to 6 M☉. Stars always attract other bodies, and in scenarios with a central star, such as the Solar System, that star counts toward this number. Takes effect when Apply & Restart rebuilds the simulation.',
  'setHelp.num_planets':
    'How many rocky planets the generator creates, each 0.1 to 1.6 Earth masses. Planets feel gravity but pull on other bodies only when Mutual Gravity is on. Takes effect when Apply & Restart rebuilds the simulation; the Low quality tier builds at most 12.',
  'setHelp.num_gas_giants':
    'How many gas giants the generator creates, each about 0.3 to 20 Jupiter masses. Unlike rocky planets, they always attract other bodies. Takes effect when Apply & Restart rebuilds the simulation; the Low quality tier builds at most 4.',
  'setHelp.enable_asteroids':
    'Master switch for generated asteroids: when off, Number of Asteroids is ignored and none are created. Takes effect when Apply & Restart rebuilds the simulation.',
  'setHelp.num_asteroids':
    'How many asteroids the generator creates when Enable Asteroids is on, each of one Ceres mass. Like rocky planets, they pull on other bodies only when Mutual Gravity is on. Takes effect when Apply & Restart rebuilds the simulation; the Low quality tier builds at most 40.',
  'setHelp.num_comets':
    "How many comets the generator creates, each 0.001 to 0.1 of Halley's mass. Comets are pulled by everything else but never pull on anything, even with Mutual Gravity on. Takes effect when Apply & Restart rebuilds the simulation; the Low quality tier builds at most 8.",
  'setHelp.init_velocity':
    'Starting speed scale, in simulation units (about 6.7 km/s each at the default G). Random placement gives each body a random direction and a speed up to half of this plus half the spread, cut to a 30% nudge on a circular orbit when one central body dominates; Grid gives up to ±15% of it per component, and Circular and Multi-Ring use it only when there is no central body. Takes effect when Apply & Restart rebuilds the simulation.',
  'setHelp.velocity_stddev':
    'Extra random spread added to starting speeds, in the same units as Initial Velocity. It is a uniform spread, not a standard deviation, and only Random placement uses it. Takes effect when Apply & Restart rebuilds the simulation.',
  'setHelp.show_trails':
    'Draws a fading line behind each moving body showing its recent path; black holes have none. Drawn effect only; takes effect at once.',
  'setHelp.trail_style':
    'Cloud draws soft layered strokes; Simple draws a thin line; Glow draws a string of glowing dots, brighter where the body moved faster. Drawn effect only; takes effect at once.',
  'setHelp.trail_length':
    'How many recorded positions each trail keeps, one per integration step, so a longer trail shows more of the orbit. The kept length also scales with zoom (0.6× to 1.5×) and can be cut by Adaptive Detail or the Low quality tier. Drawn effect only; takes effect at once.',
  'setHelp.trail_color_mode':
    "By type colors each trail with the body's own color or its type's default (stars by temperature). By speed colors each trail on a purple-to-yellow scale from the body's current speed, so a body on an eccentric orbit changes color as it speeds up and slows down. Drawn effect only; takes effect at once.",
  'setHelp.show_velocity_vectors':
    'Draws a velocity arrow (v) on the selected body; a click on a body selects it. The arrow has a fixed length and shows direction only, not speed. Takes effect at once.',
  'setHelp.show_acceleration_vectors':
    "Draws the selected body's total acceleration, the value the integrator actually used, as a fixed-length arrow, with dashed arrows to the same scale for up to eight of the strongest sources. Set beside the velocity arrow, it shows that a body does not move in the direction it is pulled. Takes effect at once.",
  'setHelp.show_potential_well':
    "Shades the background with the Newtonian gravitational potential of the heaviest bodies (up to 24), on a logarithmic color scale, using the current G and the force law's softening. It is a picture of the field only and does not change the motion. Takes effect at once.",
  'setHelp.show_scale_bar':
    'Draws a scale bar in real distance units in the bottom-left corner of the canvas, matched to the current zoom, with a note that body sizes are not to scale; it also appears in saved screenshots. Takes effect at once.',
  'setHelp.show_elapsed_time':
    'Stamps the simulated time (t = …) along the bottom of saved screenshots. The live readout shows the elapsed time whatever this is set to. Takes effect at once.',
  'setHelp.show_accretion_disk':
    'Shows or hides the accretion disk of black holes whose scenario gives them one; it cannot add a disk to a quiet hole. With Realistic Disk Physics also on, it adds small orbiting tracer particles around each black hole. Drawn effect, no mass is added; takes effect at once.',
  'setHelp.realistic_disk_physics':
    'Adds up to 150 small tracer particles orbiting each black hole that spiral in and are swallowed, only while Show Accretion Disk is on. They are decoration: they add no mass to the hole and do not affect any other body. Takes effect at once.',
  'setHelp.disk_doppler':
    'Brightens the accretion tracer particles moving toward the viewer and dims those moving away, a qualitative stand-in for relativistic beaming. It affects only those tracers, which appear when Show Accretion Disk and Realistic Disk Physics are both on; the drawn disk itself always has its own one-sided brightening. Drawn effect; takes effect at once.',
  'setHelp.show_bh_jets':
    'Shows the relativistic jets of black holes that the scenario describes as launching one; it cannot add jets to other holes. Off by default. Drawn effect only; takes effect at once.',
  'setHelp.show_object_lensing':
    "Distorts the background starfield around black holes, neutron stars and white dwarfs, as light bending would. It is a drawn effect, exaggerated so it can be seen (a white dwarf's real lensing would be invisible here); it bends only the background stars, not other bodies, and does not affect the motion. Takes effect at once, provided Lensing Quality is not off.",
  'setHelp.lensing_quality':
    'Size and strength of the lensing distortion around black holes: low 0.7×, medium 1×, high 1.6×; off turns lensing off entirely, like the toggle. Neutron-star and white-dwarf lensing looks the same at every level. Drawn effect; takes effect at once.',
  'setHelp.star_density':
    'Density of the background starfield relative to the default 10,000, which means the natural count for the window size: 5,000 gives half as many stars, 0 none, and higher values more, up to 9,000 stars. Decorative only; the starfield is redrawn when the setting is applied.',
  'setHelp.show_ambient_lighting':
    'Paints the background as a soft gradient from very dark blue at the top to near-black at the bottom; off gives a flat dark background. It does not light or shade the bodies. Takes effect at once.',
  'setHelp.dynamic_object_properties':
    "Shifts a body's color as it comes within a few hundred units of a black hole, so close approaches stand out. A drawn effect only: it does not change the motion. Takes effect at once.",
  'setHelp.planet_base_color':
    'Color of planet trails (in By type mode) and of the debris when a black hole swallows a planet, for planets the scenario has not colored. Takes effect at once.',
  'setHelp.interactive_add':
    'When on, after a type is chosen with Add object, a click on empty canvas places a new body and a drag sets its starting velocity. When off, placement is disabled; investigations turn it off to lock a scene. Takes effect at once.',
  'setHelp.follow_mode':
    'Keeps the camera centered on a body of the chosen type, or on the center of mass of all bodies of that type when there are several; None leaves the camera free. Camera only; it does not change the motion. Takes effect at once.',
  'setHelp.show_dynamic_overlays':
    'Shows the live readout panel over the canvas: elapsed time, zoom, speed, body counts, stopwatch readings, the vector key and, if enabled, the conservation check. The text description for screen readers is kept either way. Takes effect at once.',
  'setHelp.show_gravitational_waves':
    'Draws expanding rings that ripple the background starfield when black holes, neutron stars, white dwarfs or stars merge or collapse. It is a drawn effect only: it does not change the motion, and the inspiral itself comes from Orbit Decay Rate. The Low quality tier turns it off; takes effect at once.',
  'setHelp.habitable_zone_optimism':
    "Chooses which published habitable-zone definition (Kopparapu et al. 2013) a star's ring shows: below 1.3 the conservative zone (runaway to maximum greenhouse), 1.3 and above the optimistic zone (recent Venus to early Mars); values within each range are equivalent. The ring appears only for stars whose habitable zone is switched on in the object inspector or by an investigation. Takes effect at once.",
  'setHelp.integrator':
    "The numerical method that advances the bodies. Symplectic Euler (the default, which every scenario was tuned for) and Velocity Verlet keep the energy error bounded, Verlet's far smaller; RK4 is more accurate over a few orbits but its energy drifts steadily over thousands. Takes effect at once; Verlet and RK4 always sum gravity directly, never with Barnes-Hut, and black holes keep their own first-order step.",
  'setHelp.show_conservation_diagnostics':
    'Adds a conservation check to the on-canvas readout: the integrator in use and how much total energy and angular momentum have changed since the reference was taken, with the reasons this scene is not a closed system. It appears only while Show Overlays is on, and never in embeds. A large change is not necessarily an error: merging, static black holes and orbit decay change these totals by design.',
  'setHelp.use_barnes_hut':
    'Computes gravity with an approximate Barnes-Hut tree in a background worker instead of summing every pair, which is faster in crowded scenes but uses forces from a slightly earlier snapshot. It only runs with Mutual Gravity on and the Symplectic Euler integrator; otherwise the exact sum is used. Takes effect at once.',
  'setHelp.barnes_hut_theta':
    'The opening angle of the Barnes-Hut tree: smaller is more accurate and slower. Measured on a 78-body cluster, the default 0.4 gives a mean force error near 0.5% and 0.7 near 4%, with worst cases far larger. Only matters while approximate gravity is actually running.',
  'setHelp.adaptive_detail':
    'When frames run slower than the 60 fps target, trails are kept shorter, down to 60% of the set length, and grow back once the machine catches up; it is checked every 5 seconds. It changes nothing else, and never the physics. Takes effect at once.',
  'setHelp.quality_tier':
    'Automatic drops to Low when the measured frame rate stays below about 32 fps and returns to Full above about 48; Full and Low fix the tier. Low draws the canvas at 70% resolution, turns off lensing and gravitational-wave rings, shortens trails, thins the starfield and, at the next rebuild, caps generated populations (hand-placed scenarios keep every body). Drawing changes at once, and the choice is kept across scenario loads.',
  'settings.level.introductory.hint':
    'The defaults: physical units, three significant figures, and the conservation readout off. No level hides anything.',
  'settings.level.majors.hint':
    'Turns the conservation readout on and shows four significant figures, in physical units. No level hides anything.',
  'settings.level.advanced.hint':
    "Turns the conservation readout on, opens Advanced (the integrator and performance), and shows six significant figures in the simulation's own units. No level hides anything.",
};
