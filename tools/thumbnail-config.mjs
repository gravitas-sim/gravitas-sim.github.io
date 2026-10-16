// =============================================================================
// Thumbnail capture settings
// -----------------------------------------------------------------------------
// Development-only. This never ships: it exists so the capture script knows
// *when* each scenario looks like itself, which is not something the website
// needs to know and so has no business in SCENARIO_INFO.
//
// The default is to let a scenario run for a few seconds so trails establish and
// the structure becomes legible. Frame zero is the wrong moment for most of the
// catalog: a binary is two dots until it has drawn an arc, an inspiral is just a
// pair of black holes until it has visibly tightened, and a cluster is a random
// scatter until it has begun to relax.
//
// Per-scenario overrides:
//   settle  seconds of simulation to run before capturing
//   speed   sim_speed override, for systems whose own default is too slow or
//           too fast to reach a good moment in a sensible wall-clock time
//
// Framing. By default a capture uses the scenario's own preset_zoom: most of
// those are well chosen, and second-guessing them made good thumbnails worse.
// Only the scenarios that captured badly carry an override, and each says why.
//   boost      multiplies the scenario's own preset zoom
//   zoom       absolute camera zoom, replacing the scenario's own
//   autoframe  measure where the bodies are and fit them to the card
//   trail   trail_length override. A scenario's live trail is a hint of recent
//           motion; a still frame has only the trail to show that anything
//           moves, so orbital scenarios are captured with a longer one.
// =============================================================================

/** Applied to every scenario unless overridden below. */
export const DEFAULTS = {
  settle: 8,
  speed: null,
  boost: 1,
  zoom: null,
  autoframe: false,
  trail: 600,
  // Center the camera on the bodies just before capturing. Several scenarios
  // carry a net center-of-mass velocity and walk out of frame while the capture
  // waits; this follows them rather than photographing empty space.
  recenter: true,
};

export const CAPTURE = {
  // --- The dark-matter scenarios ---------------------------------------------
  // The two discs read best once the trails have drawn most of a turn, which is
  // what shows that the thing is rotating rather than just a scatter of dots.
  // The cluster is the opposite: its members are on long, slow, randomly
  // oriented orbits, so a long trail turns it into a tangle. It gets a short
  // one and a wider frame.
  // Retrograde Mars is captured in the world frame: the thumbnail should show
  // the ordinary picture the lesson starts from, not its punchline.
  'retrograde-mars': { settle: 75, speed: 5, trail: 900, autoframe: true },

  'spiral-galaxy': { settle: 26, speed: 4, trail: 900 },
  'milky-way-rotation': { settle: 26, speed: 4, trail: 900 },
  'coma-cluster': { settle: 22, speed: 3, trail: 320, boost: 1.35 },

  // --- Framed too wide at their own preset zoom -------------------------------
  // These are all small systems whose live framing leaves room to pan around.
  // In a 640x360 card that room is empty starfield and the subject is a speck,
  // so the capture pulls in and runs long enough for the trails to draw the
  // orbits: on a still frame the trail is the only thing that says anything
  // moves.
  // Comets reach far past Neptune, so measuring the extent frames the whole
  // cometary orbit and shrinks the planets to nothing. Pinned to the inner
  // system, which is the recognizable picture.
  'solar-system': { settle: 22, speed: 4, zoom: 2.6, trail: 900 },
  'earth-moon-system': { settle: 18, speed: 4, boost: 3.4, trail: 900 },
  'kuiper-belt': { settle: 14, speed: 4 },
  'habitable-zone-lab': { settle: 14, speed: 3 },
  // Two stars four AU apart take about eight hundred sim units to go round.
  // At the scenario's own speed that is a minute and a half of capture for one
  // lap, and the trail arc is the whole point of the picture.
  // Two turns of the triangle, which is long enough for the trails to draw the
  // rotation and short enough that the configuration is still a triangle. Any
  // later and the thumbnail shows the aftermath rather than the experiment.
  // The four resonance scenarios. Each runs at a speed chosen for the lesson
  // rather than for a still frame, so each overrides it: what a thumbnail needs
  // is enough trail to show the shape of the orbits and not so much that the
  // picture is a solid disc of track.
  //
  // The Jovian pair is framed on Callisto, the outermost of the four moons; the
  // detuned version is deliberately the same picture, because the difference
  // between them is a resonant angle and not anything you can see.
  'galilean-resonance': { settle: 22, speed: 60, zoom: 2.8, trail: 700 },
  'broken-laplace-resonance': {
    settle: 22,
    speed: 60,
    zoom: 2.8,
    trail: 700,
  },
  // Long enough for Pluto's eccentric orbit to draw most of a lap and cross
  // Neptune's circle, which is the whole picture.
  'pluto-and-neptune': { settle: 40, speed: 2000, zoom: 0.085, trail: 1400 },
  // Two Jupiter years. The Trojans barely move relative to Jupiter, so the
  // trails are one shared circle with the bodies spaced round it - which is
  // exactly what the scenario is about.
  'jupiter-trojans': { settle: 30, speed: 40, zoom: 0.55, trail: 900 },
  'three-body-sensitivity-lab': { settle: 48, trail: 150, zoom: 3.4 },
  'binary-pair': { settle: 20, speed: 12, zoom: 1.3, trail: 1400 },
  // Framed on the inner pair rather than on the outermost planet, which sits
  // far enough out to shrink the stars to specks.
  'binary-star-system': { settle: 20, speed: 6, zoom: 1.9, trail: 1400 },
  // The star's reflex orbit is a ten-thousandth of the planet's, so framing on
  // the pair means framing on the planet's orbit and letting the star sit at
  // the center looking stationary. That is the honest picture: the wobble is
  // real and invisible, which is the scenario's whole point.
  'exoplanet-characterization-lab': { settle: 16, speed: 6, trail: 1400 },

  // The binary labs run at very high sim speeds so a student can watch twenty
  // binary periods in half a minute, which is far too fast for a still: at
  // their own speed the capture lands after a hundred orbits with the trail
  // painted into a solid disc. Slowed right down and given a long trail, the
  // circumstellar one shows a small ring beside a big one, and the
  // circumbinary one shows the pair whirling inside a single wide orbit -
  // which is the difference between the two scenarios, in one frame each.
  // The assist scenarios run fast so a student can watch a whole encounter in
  // nine seconds, which is far too fast for a still: at their own speed the
  // capture lands with the spacecraft already gone. Slowed down and given a
  // long trail, the isolated one shows a straight planet track with a bent
  // spacecraft path crossing it - which is the entire lesson in one frame.
  'gravity-assist-lab': { settle: 26, speed: 90, trail: 2000 },
  'gravity-assist-heliocentric': { settle: 22, speed: 2, trail: 1200 },
  'binary-planet-lab': { settle: 20, speed: 40, trail: 1200 },
  'circumbinary-planet-lab': { settle: 24, speed: 200, trail: 1600 },
  'interstellar-visitor': { settle: 14, speed: 2, trail: 900 },
  'keplers-2nd-law': { settle: 16 },
  'black-hole-lab': { settle: 14 },
  'exoplanet-lab': { settle: 12 },
  'kessler-cascade': { settle: 9 },
  'white-dwarf-binary': { settle: 12, trail: 900 },
  'millisecond-pulsar': { settle: 12 },
  'pulsar-system': { settle: 12 },

  // --- Compact systems that need the zoom to find them at all -----------------
  // TRAPPIST-1 is six hundredths of an AU across; HD 209458 b transits a star
  // one stellar radius away. Their live framing is already extreme and the
  // capture takes it further.
  'trappist-1-system': { settle: 14, speed: 0.06, zoom: 46 },
  'transit-lab': { settle: 12, zoom: 150 },
  // The blended companion is 300 AU away: no frame holds both it and the
  // transiting planet, and measuring the extent collapses the system to a dot.
  'blended-binary': { settle: 12, zoom: 60 },

  // --- Framed too tight: a black disc filling the card ------------------------
  // Every one of these came back as the same featureless hole with a jet, which
  // is the failure the gallery exists to avoid: cards a reader cannot tell
  // apart. Pulling back puts each one's surroundings in frame, which is what
  // actually distinguishes them.
  'supernova-remnant': { settle: 9, autoframe: true },
  // Caught on the second plunge, with the first one still drawn as a trail.
  // The old 0.28 pulled the camera right back to find something to show; the
  // scenario now has a star being stripped at periapsis to point at.
  'tidal-disruption-event': { settle: 16, boost: 0.75 },
  'quasar-cannon': { settle: 9, boost: 0.45 },
  'the-pinwheel-galaxy-core': { settle: 14, boost: 0.22 },
  'tidal-arm-tango': { settle: 12, boost: 0.32 },
  // 0.06 was a sixteen-fold pull-back to escape a horizon the camera used to
  // start inside. The central hole is no longer a million solar masses, so the
  // scenario can be framed on its own terms.
  'black-hole-billiards': { settle: 12, boost: 0.5 },
  'galactic-center': { settle: 14, boost: 0.6 },
  'stellar-graveyard': { settle: 11, boost: 0.75 },
  'compact-object-zoo': { settle: 9, boost: 0.8 },
  'hungry-hungry-holes': { settle: 9, boost: 0.85 },

  // --- Inspirals: catch them tightening, not after they have merged -----------
  gw150914: { settle: 7 },
  'binary-bh': { settle: 8 },
  'neutron-star-collision': { settle: 6, boost: 0.8 },

  // --- Encounters: catch the encounter ---------------------------------------
  slingshot: { settle: 10 },
  'rogue-encounter': { settle: 9 },
  'star-frisbee': { settle: 8 },
  'slingshot-gauntlet': { settle: 9 },
  'galactic-collision': { settle: 14 },

  // --- Many-body: enough evolution to show structure, not enough to merge -----
  'star-cluster': { settle: 12 },
  'stellar-nursery': { settle: 12, boost: 0.8 },
  'micro-bh-swarm': { settle: 8 },
  'alien-dyson-swarm-collapse': { settle: 9 },
  'triple-bh-system': { settle: 10 },
  'sagittarius-a': { settle: 12 },
  'supermassive-bh': { settle: 10 },
  'intermediate-mass-bh': { settle: 10 },
};

/**
 * Capture settings for one scenario.
 * @param {string} key - A SCENARIO_INFO key
 * @returns {Object} settle, speed and zoom
 */
export const captureFor = key => ({ ...DEFAULTS, ...(CAPTURE[key] || {}) });

/** The seed every capture runs under, so regeneration is repeatable. */
export const THUMBNAIL_SEED = 'gravitas-thumbnails-v1';

export default CAPTURE;
