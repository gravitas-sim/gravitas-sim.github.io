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
  'Retrograde Mars': { settle: 75, speed: 5, trail: 900, autoframe: true },

  'Spiral Galaxy': { settle: 26, speed: 4, trail: 900 },
  'Milky Way Rotation': { settle: 26, speed: 4, trail: 900 },
  'Coma Cluster': { settle: 22, speed: 3, trail: 320, boost: 1.35 },

  // --- Framed too wide at their own preset zoom -------------------------------
  // These are all small systems whose live framing leaves room to pan around.
  // In a 640x360 card that room is empty starfield and the subject is a speck,
  // so the capture pulls in and runs long enough for the trails to draw the
  // orbits: on a still frame the trail is the only thing that says anything
  // moves.
  // Comets reach far past Neptune, so measuring the extent frames the whole
  // cometary orbit and shrinks the planets to nothing. Pinned to the inner
  // system, which is the recognizable picture.
  'Solar System': { settle: 22, speed: 4, zoom: 2.6, trail: 900 },
  'Earth-Moon System': { settle: 18, speed: 4, boost: 3.4, trail: 900 },
  'Kuiper Belt': { settle: 14, speed: 4 },
  'Habitable Zone Lab': { settle: 14, speed: 3 },
  // Two stars four AU apart take about eight hundred sim units to go round.
  // At the scenario's own speed that is a minute and a half of capture for one
  // lap, and the trail arc is the whole point of the picture.
  'Binary Pair': { settle: 20, speed: 12, zoom: 1.3, trail: 1400 },
  // Framed on the inner pair rather than on the outermost planet, which sits
  // far enough out to shrink the stars to specks.
  'Binary Star System': { settle: 20, speed: 6, zoom: 1.9, trail: 1400 },
  // The star's reflex orbit is a ten-thousandth of the planet's, so framing on
  // the pair means framing on the planet's orbit and letting the star sit at
  // the centre looking stationary. That is the honest picture: the wobble is
  // real and invisible, which is the scenario's whole point.
  'Exoplanet Characterization Lab': { settle: 16, speed: 6, trail: 1400 },
  'Interstellar Visitor': { settle: 14, speed: 2, trail: 900 },
  "Kepler's 2nd Law": { settle: 16 },
  'Black Hole Lab': { settle: 14 },
  'Exoplanet Lab': { settle: 12 },
  'Kessler Cascade': { settle: 9 },
  'White Dwarf Binary': { settle: 12, trail: 900 },
  'Millisecond Pulsar': { settle: 12 },
  'Pulsar System': { settle: 12 },

  // --- Compact systems that need the zoom to find them at all -----------------
  // TRAPPIST-1 is six hundredths of an AU across; HD 209458 b transits a star
  // one stellar radius away. Their live framing is already extreme and the
  // capture takes it further.
  'TRAPPIST-1 System': { settle: 14, speed: 0.06, zoom: 46 },
  'Transit Lab': { settle: 12, zoom: 150 },
  // The blended companion is 300 AU away: no frame holds both it and the
  // transiting planet, and measuring the extent collapses the system to a dot.
  'Blended Binary': { settle: 12, zoom: 60 },

  // --- Framed too tight: a black disc filling the card ------------------------
  // Every one of these came back as the same featureless hole with a jet, which
  // is the failure the gallery exists to avoid: cards a reader cannot tell
  // apart. Pulling back puts each one's surroundings in frame, which is what
  // actually distinguishes them.
  'Supernova Remnant': { settle: 9, autoframe: true },
  // Caught on the second plunge, with the first one still drawn as a trail.
  // The old 0.28 pulled the camera right back to find something to show; the
  // scenario now has a star being stripped at periapsis to point at.
  'Tidal Disruption Event': { settle: 16, boost: 0.75 },
  'Quasar Cannon': { settle: 9, boost: 0.45 },
  'The Pinwheel Galaxy Core': { settle: 14, boost: 0.22 },
  'Tidal Arm Tango': { settle: 12, boost: 0.32 },
  // 0.06 was a sixteen-fold pull-back to escape a horizon the camera used to
  // start inside. The central hole is no longer a million solar masses, so the
  // scenario can be framed on its own terms.
  'Black Hole Billiards': { settle: 12, boost: 0.5 },
  'Galactic Center': { settle: 14, boost: 0.6 },
  'Stellar Graveyard': { settle: 11, boost: 0.75 },
  'Compact Object Zoo': { settle: 9, boost: 0.8 },
  'Hungry Hungry Holes': { settle: 9, boost: 0.85 },

  // --- Inspirals: catch them tightening, not after they have merged -----------
  GW150914: { settle: 7 },
  'Binary BH': { settle: 8 },
  'Neutron Star Collision': { settle: 6, boost: 0.8 },

  // --- Encounters: catch the encounter ---------------------------------------
  Slingshot: { settle: 10 },
  'Rogue Encounter': { settle: 9 },
  'Star Frisbee': { settle: 8 },
  'Slingshot Gauntlet': { settle: 9 },
  'Galactic Collision': { settle: 14 },

  // --- Many-body: enough evolution to show structure, not enough to merge -----
  'Star Cluster': { settle: 12 },
  'Stellar Nursery': { settle: 12, boost: 0.8 },
  'Micro BH Swarm': { settle: 8 },
  'Alien Dyson Swarm Collapse': { settle: 9 },
  'Triple BH System': { settle: 10 },
  'Sagittarius A*': { settle: 12 },
  'Supermassive BH': { settle: 10 },
  'Intermediate Mass BH': { settle: 10 },
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
