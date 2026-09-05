// UI and event handling functions

import {
  computeDockPosition,
  renderDetails,
  patchDetails,
  renderEnergy,
  renderPinnedCard,
  splitIdentity,
} from './objectInspector.js';
import {
  JUPITER_MASSES_PER_SOLAR_MASS,
  EARTH_MASSES_PER_JUPITER_MASS,
} from './constants.js';
import { formatNumber, withUnit } from './format.js';
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
  resetTrailTick,
  barycenterBodies,
  bumpWorldGeneration,
  setPhysicsObjectCounter,
  SOLAR_MASS_UNIT,
  EARTH_MASS_UNIT,
  CERES_MASS_UNIT,
  HALLEY_MASS_UNIT,
  INTEGRATORS,
  getSimulationTime,
  resetSimulationTime,
  setSimulationTime,
  resetAbsorptionAccounting,
  resetConservationBaseline,
  JUPITER_MASS_UNIT,
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
  particlePool,
  findObjectAtPosition,
  // Energy calculation functions
  getObjectEnergyHistory,
  clearObjectEnergyHistory,
  clearAllEnergyHistory,
  getObjectEnergyStats,
  // Orbit preview helpers
} from './physics.js';

import {
  worldToScreen,
  debugLog,
  solarHTML,
  earthHTML,
  jupiterHTML,
} from './utils.js';
import {
  WORLD,
  BARYCENTER,
  OBJECT,
  setFrame,
  resetFrame,
  frameOriginVelocity,
  resolveFrameOrigin,
  frameState,
  onFrameChange,
} from './referenceFrame.js';
import {
  getPositionAngle,
  getInclination,
  setPositionAngle,
  setInclination,
} from './observerGeometry.js';
import { withExtras, readExtras } from './experiments/canonicalState.js';
import { SPACE_OBJECT_NAMES } from './data/objectNames.js';
import { SCENARIO_INFO } from './data/scenarioInfo.js';
import { SCENARIO_TAGS } from './data/scenarioTags.js';
import { applyPreset } from './scenarios.js';
import { buildWorld } from './world/build.js';
import { t, hasMessage, onLocaleChange } from './i18n/index.js';
import { EN } from './i18n/en.js';
import { scenarioTitle, scenarioSummary } from './i18n/scenario.js';
import { resetPotentialCache } from './vectorOverlay.js';
import { toast } from './notify.js';
import {
  toggleTool,
  isToolActive,
  toolsPointerDown,
  toolsPointerMove,
  toolsPointerUp,
  latchStopwatchTo,
  stopwatch,
  stopwatchTarget,
  setCaptureMode,
} from './sandboxTools.js';
import {
  canRecord,
  isRecording,
  startRecording,
  stopRecording,
  recordingStatus,
  extensionFor,
} from './capture.js';
import { withSeed, getWorldSeed, setWorldSeed, randomSeed } from './rng.js';
import { orbitalElements, dominantPrimary } from './orbital.js';
import { timeUnitSeconds, formatSpeed, formatDistance } from './units.js';
import { blackHoleFacts, yearsLabel } from './blackHolePhysics.js';
import {
  buildPayload,
  packBody,
  payloadSeed,
  chooseKind,
} from './shareState.js';

/**
 * Apply the selected preset scenario to the live settings.
 * Thin wrapper: the preset table itself lives in scenarios.js.
 */
const apply_preset = () => {
  // bh_layout used to be deleted here, because it had no entry in
  // DEFAULT_SETTINGS and so was the one leaked key anything noticed. It has an
  // entry now, along with the rest of the scenario-only keys, so the reset
  // inside applyPreset clears it the same way it clears everything else.
  applyPreset(SETTINGS, DEFAULT_SETTINGS, state);
};
import { generateStarfield } from './render.js';
import { toggleSonification, getSonificationState } from './audio.js';
import {
  initChart,
  updateChart,
  clearChart,
  exportChart,
  resizeChart,
} from './energyChartNew.js';

const canvas = document.getElementById('simulationCanvas');
const starfieldCanvas = document.getElementById('starfieldCanvas');

// The shared state, which used to be declared here. See js/appState.js for why
// it moved: eleven modules imported this one, and four of them wanted nothing
// from it but these objects, so every such import closed a cycle.
// Re-exported below, so that the module's public surface is unchanged by the
// move to js/preview.js.
import { checkAreaSweepValidity } from './preview.js';
import {
  state,
  SETTINGS,
  DEFAULT_SETTINGS,
  setSettings,
  current_scenario_name,
  setScenarioName as setCurrentScenarioName,
} from './appState.js';

// No global annotation helpers in clean state
// Return attractors sorted by gravitational influence m/r^2
function getDominantAttractors(startPos, limit = 1) {
  const candidates = [...bh_list, ...stars, ...neutron_stars, ...white_dwarfs];
  const G = SETTINGS.gravitational_constant;
  const scored = candidates
    .filter(b => b && b.alive)
    .map(b => {
      const dx = b.pos.x - startPos.x;
      const dy = b.pos.y - startPos.y;
      const r2 = Math.max(1e-6, dx * dx + dy * dy);
      return { body: b, influence: (G * b.mass) / r2 };
    })
    .sort((a, b) => b.influence - a.influence);
  return scored.slice(0, Math.max(1, limit)).map(s => s.body);
}

// How many equal-time slices the area-sweep overlay is cut into. Exposed so a
// lesson can let a student change it and watch the areas stay equal.
let areaSweepWedges = 8;

/**
 * Set the number of equal-area wedges and rebuild the overlay.
 * @param {number} n - Wedge count
 */
const setAreaSweepWedges = n => {
  areaSweepWedges = Math.max(2, Math.min(24, Math.round(n)));
  const ov = state.areaSweepOverlay;
  if (!ov.active || !ov.objectId) return;
  const body = [...planets, ...asteroids, ...comets, ...gas_giants].find(
    o => o.id === ov.objectId
  );
  if (!body) return;
  const data = computeAreaSweep(body, areaSweepWedges);
  if (data) Object.assign(state.areaSweepOverlay, data, { active: true });
};

/** @returns {number} Current wedge count */
const getAreaSweepWedges = () => areaSweepWedges;

/**
 * Draw the equal-area wedges for a given body.
 *
 * Normally this is reached through the inspector's toggle, which a lesson
 * hides. A lesson that asks a student to click planets and compare their
 * orbits needs the overlay to follow the selection instead.
 *
 * @param {Object} obj - Body to draw the sweep for
 * @returns {boolean} True if an overlay was produced
 */
const showAreaSweepFor = obj => {
  if (!obj || areaSweepSuppressed) return false;
  const data = computeAreaSweep(obj, areaSweepWedges);
  if (!data) return false;
  Object.assign(state.areaSweepOverlay, data, { active: true });
  return true;
};

// The Kepler's 2nd Law scenario switches the wedges on when it builds, a fifth
// of a second after the rest of it. That is right for the lesson that scenario
// was made for and wrong for any other lesson borrowing the same star and
// planets, so a caller can refuse them outright rather than racing that timer
// to switch them off again.
let areaSweepSuppressed = false;

/**
 * Refuse or allow the equal-area wedges.
 * @param {boolean} on - True to keep them off the screen
 */
const setAreaSweepSuppressed = on => {
  areaSweepSuppressed = Boolean(on);
  if (areaSweepSuppressed) state.areaSweepOverlay.active = false;
};

/** @returns {boolean} True while the wedges are being refused */
const isAreaSweepSuppressed = () => areaSweepSuppressed;

/**
 * Solve Kepler's equation M = E - e sin(E) for the eccentric anomaly.
 *
 * Newton's method, which converges in a handful of iterations for every
 * eccentricity a bound orbit can have.
 *
 * @param {number} M - Mean anomaly, radians
 * @param {number} e - Eccentricity
 * @returns {number} Eccentric anomaly, radians
 */
function solveKepler(M, e) {
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 40; i++) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    const dE = f / fp;
    E -= dE;
    if (Math.abs(dE) < 1e-13) break;
  }
  return E;
}

/**
 * Build the equal-area wedges for a body's orbit.
 *
 * The orbit is constructed analytically from the orbital elements rather than
 * by integrating. Integrating stepped for exactly one analytic period, but
 * symplectic Euler's own period differs from the analytic one by a fraction of
 * a percent, so the path never quite closed: the wedges spanned 359.3 degrees
 * and left a thin unfilled remainder at periapsis, where the angular rate is
 * highest and the gap is most visible. Solving Kepler's equation instead closes
 * the ellipse exactly and divides it into intervals of exactly equal time,
 * which by conservation of angular momentum are intervals of exactly equal
 * area.
 *
 * @param {Object} obj - The orbiting body
 * @param {number} [wedgeCount] - How many equal-time segments to cut
 * @returns {Object|null} Overlay data, or null if the orbit is not bound
 */
function computeAreaSweep(obj, wedgeCount = areaSweepWedges) {
  const G = SETTINGS.gravitational_constant;
  const candidates = [
    ...bh_list,
    ...stars,
    ...neutron_stars,
    ...white_dwarfs,
    ...gas_giants,
  ];
  let parent = null;
  let maxInfluence = -Infinity;
  for (const b of candidates) {
    if (!b || !b.alive || b === obj) continue;
    const dx = obj.pos.x - b.pos.x;
    const dy = obj.pos.y - b.pos.y;
    const r2 = Math.max(1e-6, dx * dx + dy * dy);
    const influence = (G * b.mass) / r2;
    if (influence > maxInfluence) {
      maxInfluence = influence;
      parent = b;
    }
  }
  if (!parent) return null;

  const rx = obj.pos.x - parent.pos.x;
  const ry = obj.pos.y - parent.pos.y;
  const vx = obj.vel.x - parent.vel.x;
  const vy = obj.vel.y - parent.vel.y;

  const r = Math.hypot(rx, ry);
  if (!(r > 0)) return null;
  const mu = G * (parent.mass + (obj.mass || 0));
  const energy = (vx * vx + vy * vy) / 2 - mu / r;
  if (!(energy < 0)) return null; // unbound: no closed orbit to divide

  const a = -mu / (2 * energy);
  const h = rx * vy - ry * vx;
  // Eccentricity vector, which points from the focus toward periapsis.
  const ex = (vy * h) / mu - rx / r;
  const ey = (-vx * h) / mu - ry / r;
  const e = Math.min(0.999, Math.hypot(ex, ey));
  const omega = Math.atan2(ey, ex);
  // Sign of the angular momentum sets the direction of travel.
  const dir = h >= 0 ? 1 : -1;

  // Where the body is now, as a mean anomaly, so the wedges start from it.
  const cosNu = (ex * rx + ey * ry) / (Math.max(e, 1e-9) * r);
  const nu0 =
    Math.sign(rx * ey - ry * ex) === 0
      ? Math.acos(Math.max(-1, Math.min(1, cosNu)))
      : -Math.sign(rx * ey - ry * ex) *
        Math.acos(Math.max(-1, Math.min(1, cosNu)));
  const E0 =
    2 *
    Math.atan2(
      Math.sqrt(1 - e) * Math.sin(nu0 / 2),
      Math.sqrt(1 + e) * Math.cos(nu0 / 2)
    );
  const M0 = E0 - e * Math.sin(E0);

  const N = Math.max(2, Math.min(24, Math.round(wedgeCount)));
  const PER_WEDGE = 90;
  const b = a * Math.sqrt(1 - e * e);
  const cosW = Math.cos(omega);
  const sinW = Math.sin(omega);

  const at = M => {
    const E = solveKepler(M, e);
    // Perifocal coordinates, then rotated into the simulation frame.
    const xp = a * (Math.cos(E) - e);
    const yp = b * Math.sin(E) * dir;
    return { x: xp * cosW - yp * sinW, y: xp * sinW + yp * cosW };
  };

  const wedges = [];
  const orbitPoints = [];
  for (let w = 0; w < N; w++) {
    const wedge = [];
    for (let k = 0; k <= PER_WEDGE; k++) {
      const M = M0 + 2 * Math.PI * ((w + k / PER_WEDGE) / N);
      const pt = at(M);
      wedge.push(pt);
      if (k < PER_WEDGE || w === N - 1) orbitPoints.push(pt);
    }
    wedges.push(wedge);
  }
  // Close the outline exactly on the point it started from.
  orbitPoints.push({ ...orbitPoints[0] });

  const period = 2 * Math.PI * Math.sqrt((a * a * a) / mu);
  return {
    parentId: parent.id,
    parent,
    objectId: obj.id,
    wedges,
    orbitPoints,
    wedgeCount: N,
    period,
    wedgeTime: period / N,
    a,
    e,
  };
}

function computeCircularVelocity(startPos, body) {
  const G = SETTINGS.gravitational_constant;
  const dx = startPos.x - body.pos.x;
  const dy = startPos.y - body.pos.y;
  const dist = Math.max(1e-6, Math.hypot(dx, dy));
  const v = Math.sqrt((G * body.mass) / dist);
  const angle = Math.atan2(startPos.y - body.pos.y, startPos.x - body.pos.x);
  const tangent = angle + Math.PI / 2;
  return { x: v * Math.cos(tangent), y: v * Math.sin(tangent) };
}

// Integrate a short trajectory preview under dominant attractors
function computeTrajectoryPreview(
  startPos,
  initialVel,
  useCircularSnap = false
) {
  const bodies = getDominantAttractors(startPos, 1);
  if (bodies.length === 0) return null;
  let vel = { x: initialVel.x, y: initialVel.y };
  // If snapping, replace initial velocity with circular around most influential body
  if (useCircularSnap && bodies[0]) {
    vel = computeCircularVelocity(startPos, bodies[0]);
  }
  const points = [];
  let p = { x: startPos.x, y: startPos.y };
  const dt = 0.12; // preview integration step in sim seconds
  // Adaptive number of steps: fewer when moving slowly, more when fast
  const vPreviewMag = Math.hypot(vel.x, vel.y);
  const stepsBase = 120;
  const stepsK = 0.8; // sensitivity; tune if needed
  const steps = Math.max(
    80,
    Math.min(300, Math.floor(stepsBase + stepsK * vPreviewMag))
  );
  const softening2 = 1e-3;
  const G = SETTINGS.gravitational_constant;
  for (let i = 0; i < steps; i++) {
    const b = bodies[0];
    const dx = b.pos.x - p.x;
    const dy = b.pos.y - p.y;
    const r2 = dx * dx + dy * dy + softening2;
    const invR = 1 / Math.sqrt(r2);
    const aMag = (G * b.mass) / r2;
    const ax = aMag * dx * invR;
    const ay = aMag * dy * invR;
    vel.x += ax * dt;
    vel.y += ay * dt;
    p.x += vel.x * dt;
    p.y += vel.y * dt;
    points.push({ x: p.x, y: p.y });
    // Early stop if far off-screen to save work
    if (Math.abs(p.x) > 1e6 || Math.abs(p.y) > 1e6) break;
  }
  return { points, velSuggested: vel, attractor: bodies[0] };
}

// Update orbit helper preview during drag (reflects trajectory if released now)
function updateOrbitHelper(shiftSnap) {
  if (!state.adding_mass || !state.orbit_helper.enabled) {
    state.orbit_helper.preview = null;
    return;
  }
  // Compute initial velocity from current drag vector (same scaling as placement)
  const current = screen_to_world(state.mouse);
  const initialVel = {
    x: (current.x - state.add_start_world.x) * 3,
    y: (current.y - state.add_start_world.y) * 3,
  };
  state.orbit_helper.preview = computeTrajectoryPreview(
    state.add_start_world,
    initialVel,
    !!shiftSnap
  );
}

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
// Hold this long on empty canvas to arm object placement on touch devices.
const LONG_PRESS_MS = 380;

let localSettings = {};

// Space Object Name Database
if (typeof window !== 'undefined') {
  window.SPACE_OBJECT_NAMES = SPACE_OBJECT_NAMES;
}

// Expanded scenario information

// Object inspection functions - copied from working original file
const PLANET_RADIUS = 5; // From physics.js
const GAS_GIANT_RADIUS = 8; // From physics.js
const STAR_OBJ_RADIUS = 20; // From physics.js
const NEUTRON_STAR_RADIUS = 3; // From physics.js
const WHITE_DWARF_RADIUS = 8; // From physics.js
const ASTEROID_RADIUS = 2; // From physics.js

const getBlackHoleInfo = bh => {
  const massInSuns = bh.mass / SOLAR_MASS_UNIT;
  // Every derived number comes from blackHolePhysics.js, which is also what the
  // "Black Holes by the Numbers" investigation reads. The lesson asks students
  // to discover the trends in exactly these quantities, so the two have to
  // agree to the last digit.
  const f = blackHoleFacts(massInSuns);
  const bhType = f.category;

  return {
    icon: '\u26ab',
    title: bh.name || 'Black Hole',
    stats: [
      {
        label: t('inspector.stat.mass'),
        value: `${solarHTML(formatNumber(massInSuns))} (${withUnit(f.massKg, 'kg')})`,
      },
      {
        label: t('inspector.stat.schwarzschildRadius'),
        value: `${withUnit(f.rsKm, 'km')} (${withUnit(f.rsAU, 'AU')})`,
      },
      {
        label: t('inspector.stat.escapeVelocityAtRs'),
        value: '100.0% of light speed',
      },
      {
        label: t('inspector.stat.averageDensity'),
        value: withUnit(f.density, 'kg/m\u00b3'),
      },
      {
        label: t('inspector.stat.hawkingTemperature'),
        value: withUnit(f.temperature, 'K'),
      },
      {
        // toFixed() gives up above 1e21 and returns the raw float, so this row
        // used to read "2.0973585980140657e+61 billion years".
        label: t('inspector.stat.hawkingLifetime'),
        value: yearsLabel(f.lifetimeYears),
      },
      {
        // A stellar-mass hole's innermost stable orbit takes milliseconds, and
        // rounding that to "0.0 hours" hid the most striking thing about it.
        label: t('inspector.stat.iscoPeriod'),
        value:
          f.iscoPeriodSeconds < 60
            ? withUnit(f.iscoPeriodSeconds, 's')
            : withUnit(f.iscoPeriodHours, 'hours'),
      },
      { label: t('inspector.stat.type'), value: bhType },
      {
        label: t('inspector.stat.position'),
        value: `(${bh.pos.x.toFixed(1)}, ${bh.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(bh.vel.x, bh.vel.y)),
      },
    ],
    description: `A ${bhType.toLowerCase()} black hole with ${massInSuns > 1e6 ? 'enormous' : massInSuns > 100 ? 'substantial' : massInSuns > 3 ? 'moderate' : 'minimal'} mass. The event horizon has a radius of ${f.rsKm.toFixed(1)} km. ${f.temperature > 1 ? 'This black hole emits Hawking radiation.' : 'This black hole is too massive to emit significant Hawking radiation.'} ${massInSuns > 1e6 ? 'Supermassive black holes like this power active galactic nuclei and quasars.' : massInSuns > 100 ? 'Intermediate black holes are rare and may form from merging stellar-mass black holes.' : massInSuns > 3 ? 'Stellar-mass black holes form from the collapse of massive stars.' : 'Primordial black holes may have formed in the early universe.'}`,
  };
};

/**
 * Orbital period of a body about whatever it is actually orbiting, in days.
 *
 * Replaces four copies of a calculation that assumed a 1000-unit primary
 * sitting at the origin and measured distance from the origin rather than from
 * the primary, on a length scale that matched neither the simulation nor
 * units.js. In the Kepler scenario it reported 3.1 days for an orbit whose real
 * period is about 1.7 years, which is the sort of number a student is asked to
 * write down in an investigation.
 *
 * @param {Object} body - The orbiting object
 * @returns {number|null} Period in days, or null if unbound or with no primary
 */
const realOrbitalPeriodDays = body => {
  if (!body?.pos) return null;
  const primary = dominantPrimary(
    body,
    [...bh_list, ...stars, ...neutron_stars, ...white_dwarfs].filter(
      p => p !== body
    )
  );
  if (!primary) return null;
  const el = orbitalElements(body, primary, SETTINGS.gravitational_constant);
  if (!el || !el.bound || !isFinite(el.period)) return null;
  return (el.period * timeUnitSeconds()) / 86400;
};

/**
 * Format an orbital period for the inspector.
 * @param {number|null} days - Period in days
 * @returns {string} Display text
 */
const formatOrbitalPeriod = days => {
  if (days === null) return 'unbound';
  if (days > 365) return withUnit(days / 365, 'years');
  if (days < 1) return withUnit(days * 24, 'hours');
  return withUnit(days, 'days');
};

const getStarInfo = star => {
  const massInSuns = star.massInSuns || star.mass / SOLAR_MASS_UNIT;
  const radiusInSuns = star.radius / STAR_OBJ_RADIUS;
  const radiusInKm = radiusInSuns * 696340; // Solar radius in km
  const massInKg = massInSuns * 1.989e30; // Solar mass in kg

  // Real surface temperature estimate based on mass
  const surfaceTemperature = 3000 + (massInSuns - 0.2) * 4000; // K

  // Real luminosity in solar units
  const luminosity = Math.pow(massInSuns, 3.5); // Solar luminosity units

  // Real surface gravity (m/s²)
  const G = 6.6743e-11;
  const surfaceGravity = (G * massInKg) / Math.pow(radiusInKm * 1000, 2);

  // Real escape velocity (m/s)
  const escapeVelocity = Math.sqrt((2 * G * massInKg) / (radiusInKm * 1000));

  // Real orbital period at 1 AU (if applicable)
  const orbitalPeriodDays = realOrbitalPeriodDays(star);

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
      {
        label: t('inspector.stat.mass'),
        value: `${solarHTML(formatNumber(massInSuns))} (${withUnit(massInKg, 'kg')})`,
      },
      {
        label: t('inspector.stat.radius'),
        value: `${solarHTML(formatNumber(radiusInSuns), 'R')} (${withUnit(radiusInKm, 'km')})`,
      },
      {
        label: t('inspector.stat.surfaceTemperature'),
        value: withUnit(surfaceTemperature, 'K'),
      },
      {
        label: t('inspector.stat.luminosity'),
        value: solarHTML(formatNumber(luminosity), 'L'),
      },
      {
        label: t('inspector.stat.surfaceGravity'),
        value: withUnit(surfaceGravity, 'm/s²'),
      },
      {
        label: t('inspector.stat.escapeVelocity'),
        value: withUnit(escapeVelocity / 1000, 'km/s'),
      },
      { label: t('inspector.stat.spectralType'), value: spectralType },
      {
        label: t('inspector.stat.lifespan'),
        value: withUnit(age, 'billion years'),
      },
      {
        label: t('inspector.stat.orbitalPeriod'),
        value: formatOrbitalPeriod(orbitalPeriodDays),
      },
      {
        label: t('inspector.stat.position'),
        value: `(${star.pos.x.toFixed(1)}, ${star.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(star.vel.x, star.vel.y)),
      },
    ],
    description: `A ${spectralType}-type star with ${massInSuns > 3 ? 'high' : massInSuns > 0.8 ? 'moderate' : 'low'} mass. ${massInSuns > 20 ? 'This massive star will likely end its life as a black hole.' : massInSuns > 8 ? 'This star will become a neutron star or black hole.' : 'This star will become a white dwarf.'}`,
  };
};

const getPlanetInfo = planet => {
  // The fallback divides by the Earth unit, not by 1. Dividing by 1 reports the
  // raw simulation mass as though it were a number of Earth masses, which is
  // wrong by a factor of 333 and is the same failure MASS_UNITS.md documents.
  const massInEarths = planet.massInEarths ?? planet.mass / EARTH_MASS_UNIT;
  const radiusInEarths = planet.radius / PLANET_RADIUS;
  const radiusInKm = radiusInEarths * 6371; // Earth radius in km
  const massInKg = massInEarths * 5.972e24; // Earth mass in kg

  // Real density calculation (kg/m³)
  const volume = (4 / 3) * Math.PI * Math.pow(radiusInKm * 1000, 3); // Convert km to m
  const density = massInKg / volume;

  // Real escape velocity (m/s)
  const G = 6.6743e-11; // Gravitational constant
  const escapeVelocity = Math.sqrt((2 * G * massInKg) / (radiusInKm * 1000));

  // Real orbital period (if orbiting a central mass)
  const orbitalPeriodDays = realOrbitalPeriodDays(planet);

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
      densityDescription =
        'Gaseous composition with hydrogen and helium atmosphere';
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
      {
        label: t('inspector.stat.mass'),
        value: `${earthHTML(formatNumber(massInEarths))} (${withUnit(massInKg, 'kg')})`,
      },
      {
        label: t('inspector.stat.radius'),
        value: `${withUnit(radiusInEarths, 'R⊕')} (${withUnit(radiusInKm, 'km')})`,
      },
      { label: t('inspector.stat.density'), value: withUnit(density, 'kg/m³') },
      {
        label: t('inspector.stat.surfaceGravity'),
        value: withUnit(surfaceGravity, 'm/s²'),
      },
      {
        label: t('inspector.stat.escapeVelocity'),
        value: withUnit(escapeVelocity / 1000, 'km/s'),
      },
      {
        label: t('inspector.stat.orbitalPeriod'),
        value: formatOrbitalPeriod(orbitalPeriodDays),
      },
      { label: t('inspector.stat.type'), value: planetType },
      {
        label: t('inspector.stat.position'),
        value: `(${planet.pos.x.toFixed(1)}, ${planet.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(planet.vel.x, planet.vel.y)),
      },
    ],
    description: `A ${planetType.toLowerCase()} with ${massInEarths > 10 ? 'substantial' : massInEarths > 1 ? 'moderate' : 'low'} mass. ${densityDescription}. ${planetType === 'Terrestrial' ? 'This rocky world could potentially support life.' : planetType === 'Gas Giant' ? 'This gaseous planet has no solid surface.' : planetType === 'Ice Giant' ? 'This icy world is composed mainly of frozen volatiles.' : 'This small world may be a captured asteroid or dwarf planet.'}`,
  };
};

const getGasGiantInfo = gasGiant => {
  const massInJupiters =
    gasGiant.massInJupiters || gasGiant.mass / JUPITER_MASS_UNIT;
  const massInEarths = massInJupiters * EARTH_MASSES_PER_JUPITER_MASS;
  const radiusInJupiters = gasGiant.radius / GAS_GIANT_RADIUS;
  const radiusInEarths = radiusInJupiters * 11.2; // Convert Jupiter radius to Earth radius (1 Jupiter = 11.2 Earth radii)
  const radiusInKm = radiusInEarths * 6371; // Earth radius in km
  const massInKg = massInEarths * 5.972e24; // Earth mass in kg

  // Real density calculation (kg/m³)
  const volume = (4 / 3) * Math.PI * Math.pow(radiusInKm * 1000, 3);
  const density = massInKg / volume;

  // Real escape velocity (m/s)
  const G = 6.6743e-11;
  const escapeVelocity = Math.sqrt((2 * G * massInKg) / (radiusInKm * 1000));

  // Real surface gravity (m/s²)
  const surfaceGravity = (G * massInKg) / Math.pow(radiusInKm * 1000, 2);

  // Real orbital period
  const orbitalPeriodDays = realOrbitalPeriodDays(gasGiant);

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
  const displayType = giantType
    .replace('_', ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  return {
    icon: '🪐',
    title: gasGiant.name || 'Gas Giant',
    stats: [
      {
        label: t('inspector.stat.mass'),
        value: `${jupiterHTML(formatNumber(massInJupiters))} · ${earthHTML(formatNumber(massInEarths))}`,
      },
      {
        label: t('inspector.stat.radius'),
        value: `${withUnit(radiusInEarths, 'R⊕')} (${withUnit(radiusInKm, 'km')})`,
      },
      { label: t('inspector.stat.density'), value: withUnit(density, 'kg/m³') },
      {
        label: t('inspector.stat.surfaceGravity'),
        value: withUnit(surfaceGravity, 'm/s²'),
      },
      {
        label: t('inspector.stat.escapeVelocity'),
        value: withUnit(escapeVelocity / 1000, 'km/s'),
      },
      {
        label: t('inspector.stat.orbitalPeriod'),
        value: formatOrbitalPeriod(orbitalPeriodDays),
      },
      { label: t('inspector.stat.type'), value: displayType },
      {
        label: t('inspector.stat.position'),
        value: `(${gasGiant.pos.x.toFixed(1)}, ${gasGiant.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(gasGiant.vel.x, gasGiant.vel.y)),
      },
    ],
    description: `A ${displayType.toLowerCase()} with ${massInEarths > 3000 ? 'enormous' : massInEarths > 1000 ? 'substantial' : 'moderate'} mass. ${giantType === 'brown_dwarf' ? 'This object is massive enough to fuse deuterium but not hydrogen, making it a failed star.' : giantType === 'super_jupiter' ? 'This massive gas giant has extreme atmospheric pressures and may have formed directly from a protoplanetary disk.' : giantType === 'jupiter_like' ? 'This Jupiter-like planet has a thick hydrogen-helium atmosphere with distinctive banding patterns.' : giantType === 'neptune_like' ? 'This Neptune-like ice giant has a composition rich in water, ammonia, and methane ices.' : 'This mini-Neptune has a substantial atmosphere but is smaller than typical gas giants.'}`,
  };
};
const getAsteroidInfo = asteroid => {
  // Divided by the Earth unit rather than by a literal 1: this row is what the
  // inspector shows next to a mass slider that works in Earth masses, and the
  // two have to be the same number.
  const massInEarths = asteroid.mass / EARTH_MASS_UNIT;
  const massInKg = massInEarths * 5.972e24;
  const radiusInKm = asteroid.radius * 1000; // Rough conversion
  const radiusInM = radiusInKm * 1000;

  // Real density calculation (kg/m³)
  const volume = (4 / 3) * Math.PI * Math.pow(radiusInM, 3);
  const density = massInKg / volume;

  // Real escape velocity (m/s)
  const G = 6.6743e-11;
  const escapeVelocity = Math.sqrt((2 * G * massInKg) / radiusInM);

  // Real surface gravity (m/s²)
  const surfaceGravity = (G * massInKg) / Math.pow(radiusInM, 2);

  // Real orbital period
  const orbitalPeriodDays = realOrbitalPeriodDays(asteroid);

  let asteroidType = 'Asteroid';
  if (asteroid.radius > 5) asteroidType = 'Dwarf Planet';
  else if (asteroid.radius > 2) asteroidType = 'Large Asteroid';
  else asteroidType = 'Small Asteroid';

  return {
    icon: '☄️',
    title: asteroid.name || 'Asteroid',
    stats: [
      {
        label: t('inspector.stat.mass'),
        value: `${earthHTML(formatNumber(massInEarths, { sig: 4 }))} (${withUnit(massInKg, 'kg')})`,
      },
      { label: t('inspector.stat.radius'), value: withUnit(radiusInKm, 'km') },
      { label: t('inspector.stat.density'), value: withUnit(density, 'kg/m³') },
      {
        label: t('inspector.stat.surfaceGravity'),
        value: withUnit(surfaceGravity, 'm/s²'),
      },
      {
        label: t('inspector.stat.escapeVelocity'),
        value: withUnit(escapeVelocity / 1000, 'km/s'),
      },
      {
        label: t('inspector.stat.orbitalPeriod'),
        value: formatOrbitalPeriod(orbitalPeriodDays),
      },
      { label: t('inspector.stat.type'), value: asteroidType },
      {
        label: t('inspector.stat.position'),
        value: `(${asteroid.pos.x.toFixed(1)}, ${asteroid.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(asteroid.vel.x, asteroid.vel.y)),
      },
    ],
    description: `A ${asteroidType.toLowerCase()} with ${asteroid.radius > 5 ? 'significant' : asteroid.radius > 2 ? 'moderate' : 'minimal'} mass. ${asteroidType === 'Dwarf Planet' ? 'This object is large enough to be rounded by its own gravity.' : 'This rocky body orbits in the system, potentially as part of a belt or as a rogue object.'}`,
  };
};

const getNeutronStarInfo = neutronStar => {
  const massInSuns =
    neutronStar.massInSuns || neutronStar.mass / SOLAR_MASS_UNIT;
  const radiusInKm = neutronStar.radius * 1000; // Rough conversion to km
  const density =
    neutronStar.mass / (Math.PI * neutronStar.radius * neutronStar.radius);
  const escapeVelocity = Math.sqrt(
    (2 * SETTINGS.gravitational_constant * neutronStar.mass) /
      neutronStar.radius
  );
  const schwarzschildRadius =
    (2 * SETTINGS.gravitational_constant * neutronStar.mass) / (3e8 * 3e8); // Simplified

  const starType = neutronStar.starType || 'Neutron Star';
  const isPulsar = neutronStar.pulsar || false;

  return {
    icon: isPulsar ? '⚡' : '⭐',
    title: neutronStar.name || starType,
    stats: [
      {
        label: t('inspector.stat.mass'),
        value: solarHTML(formatNumber(massInSuns)),
      },
      { label: t('inspector.stat.radius'), value: withUnit(radiusInKm, 'km') },
      {
        label: t('inspector.stat.density'),
        value: withUnit(density, 'mass/unit²'),
      },
      {
        label: t('inspector.stat.escapeVelocity'),
        value: formatSpeed(escapeVelocity),
      },
      {
        label: t('inspector.stat.schwarzschildRadius'),
        value: formatDistance(schwarzschildRadius),
      },
      { label: t('inspector.stat.type'), value: starType },
      { label: t('inspector.stat.pulsar'), value: isPulsar ? 'Yes' : 'No' },
      {
        label: t('inspector.stat.position'),
        value: `(${neutronStar.pos.x.toFixed(1)}, ${neutronStar.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(neutronStar.vel.x, neutronStar.vel.y)),
      },
    ],
    description: `A ${starType.toLowerCase()} with ${massInSuns > 2.0 ? 'extreme' : 'high'} density. ${isPulsar ? 'This pulsar emits regular beams of radiation as it rotates.' : 'This neutron star is the collapsed core of a massive star.'} ${starType === 'Magnetar' ? 'This magnetar has an extremely strong magnetic field, making it one of the most powerful objects in the universe.' : starType === 'Pulsar' ? 'This pulsar rotates rapidly, emitting beams of radiation that sweep across space.' : 'This neutron star is composed almost entirely of neutrons, making it incredibly dense.'}`,
  };
};

const getWhiteDwarfInfo = whiteDwarf => {
  const massInSuns = whiteDwarf.massInSuns || whiteDwarf.mass / SOLAR_MASS_UNIT;
  const radiusInEarths = whiteDwarf.radius / PLANET_RADIUS; // Compare to Earth radius
  const density =
    whiteDwarf.mass / (Math.PI * whiteDwarf.radius * whiteDwarf.radius);
  const escapeVelocity = Math.sqrt(
    (2 * SETTINGS.gravitational_constant * whiteDwarf.mass) / whiteDwarf.radius
  );
  const chandrasekharLimit = 1.4; // Solar masses

  const dwarfType = whiteDwarf.dwarfType || 'Carbon-Oxygen';

  return {
    icon: '⭐',
    title: whiteDwarf.name || 'White Dwarf',
    stats: [
      {
        label: t('inspector.stat.mass'),
        value: solarHTML(formatNumber(massInSuns)),
      },
      {
        label: t('inspector.stat.radius'),
        value: withUnit(radiusInEarths, 'R⊕'),
      },
      {
        label: t('inspector.stat.density'),
        value: withUnit(density, 'mass/unit²'),
      },
      {
        label: t('inspector.stat.escapeVelocity'),
        value: formatSpeed(escapeVelocity),
      },
      {
        label: t('inspector.stat.chandrasekharLimit'),
        value: solarHTML(chandrasekharLimit),
      },
      { label: t('inspector.stat.type'), value: dwarfType },
      {
        label: t('inspector.stat.position'),
        value: `(${whiteDwarf.pos.x.toFixed(1)}, ${whiteDwarf.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(whiteDwarf.vel.x, whiteDwarf.vel.y)),
      },
    ],
    description: `A ${dwarfType.toLowerCase()} white dwarf with ${massInSuns > 1.2 ? 'high' : massInSuns > 0.6 ? 'moderate' : 'low'} mass. ${dwarfType === 'Oxygen-Neon' ? 'This massive white dwarf is near the Chandrasekhar limit and may become a neutron star.' : dwarfType === 'Carbon-Oxygen' ? 'This is the most common type of white dwarf, composed of carbon and oxygen.' : 'This low-mass white dwarf is composed primarily of helium.'} ${massInSuns > chandrasekharLimit ? 'This white dwarf exceeds the Chandrasekhar limit and may collapse into a neutron star.' : 'This white dwarf is stable and will slowly cool over billions of years.'}`,
  };
};

/**
 * Inspector contents for a galaxy.
 *
 * The mass is reported in solar masses like everything else in the app, and the
 * scenarios that contain galaxies say plainly that they are scale models. A
 * real cluster member is around 10^11 solar masses and a real cluster is
 * megaparsecs across; running those numbers would need the whole unit system
 * rebuilt for no gain, because what the lesson measures is a ratio of two
 * masses and a ratio does not care what the units were.
 *
 * @param {Object} galaxy - Galaxy object
 * @returns {Object} Info for the inspector
 */
const getGalaxyInfo = galaxy => {
  const massInSuns = galaxy.mass / SOLAR_MASS_UNIT;
  const speed = Math.hypot(galaxy.vel.x, galaxy.vel.y);
  const type = galaxy.galaxyType === 'elliptical' ? 'Elliptical' : 'Spiral';

  return {
    icon: '🌌',
    title: galaxy.name || 'Galaxy',
    stats: [
      {
        label: t('inspector.stat.mass'),
        value: solarHTML(formatNumber(massInSuns)),
      },
      { label: t('inspector.stat.type'), value: type },
      { label: t('inspector.stat.speed'), value: formatSpeed(speed) },
      {
        label: t('inspector.stat.position'),
        value: `(${galaxy.pos.x.toFixed(1)}, ${galaxy.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: `(${formatSpeed(galaxy.vel.x)}, ${formatSpeed(galaxy.vel.y)})`,
      },
    ],
    description:
      type === 'Spiral'
        ? 'A disc of stars, gas and dust with spiral arms, seen here at an angle. Inside it the stars orbit the center; from outside, in a cluster, the whole thing counts as a single moving mass.'
        : 'A rounded swarm of old stars with little gas left to form new ones. The largest galaxies in a cluster are usually of this kind, sitting near its center.',
  };
};

const getCometInfo = comet => {
  // Halley masses. The 0.1 that was here was a third copy of the constant the
  // Comet constructor had wrong.
  const massInComets = comet.massInComets ?? comet.mass / HALLEY_MASS_UNIT;
  const radiusInKm = comet.radius * 1000; // Rough conversion to km
  const density = comet.mass / (Math.PI * comet.radius * comet.radius);
  const escapeVelocity = Math.sqrt(
    (2 * SETTINGS.gravitational_constant * comet.mass) / comet.radius
  );
  const tailLength = comet.tailLength || 35;

  const cometType = comet.cometType || 'short_period';
  const displayType = cometType
    .replace('_', ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  return {
    icon: '☄️',
    title: comet.name || 'Comet',
    stats: [
      { label: t('inspector.stat.mass'), value: withUnit(massInComets, 'C') },
      { label: t('inspector.stat.radius'), value: withUnit(radiusInKm, 'km') },
      {
        label: t('inspector.stat.density'),
        value: withUnit(density, 'mass/unit²'),
      },
      {
        label: t('inspector.stat.escapeVelocity'),
        value: formatSpeed(escapeVelocity),
      },
      {
        label: t('inspector.stat.tailLength'),
        value: formatDistance(tailLength),
      },
      { label: t('inspector.stat.type'), value: displayType },
      {
        label: t('inspector.stat.position'),
        value: `(${comet.pos.x.toFixed(1)}, ${comet.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(comet.vel.x, comet.vel.y)),
      },
    ],
    description: `A ${displayType.toLowerCase()} comet with ${massInComets > 0.1 ? 'substantial' : massInComets > 0.01 ? 'moderate' : 'small'} mass. ${cometType === 'periodic' ? "This periodic comet returns to the inner solar system regularly, like Halley's Comet." : cometType === 'long_period' ? 'This long-period comet has an orbital period of more than 200 years.' : 'This short-period comet completes its orbit in less than 200 years.'} The comet's tail is ${tailLength > 50 ? 'very long' : tailLength > 30 ? 'moderate' : 'short'} and points away from the sun due to solar radiation pressure.`,
  };
};

/**
 * Check whether an object is still part of the running simulation.
 * Objects leave via absorption, merging or off-screen culling, any of which
 * can happen while a panel still holds a reference to them.
 * @param {Object} object - Physics object to test
 * @returns {boolean} True if the object is still simulated
 */
const isObjectStillInSimulation = object => {
  if (!object) return false;
  if (object.alive === false) return false;
  return (
    bh_list.includes(object) ||
    planets.includes(object) ||
    stars.includes(object) ||
    gas_giants.includes(object) ||
    asteroids.includes(object) ||
    comets.includes(object) ||
    neutron_stars.includes(object) ||
    white_dwarfs.includes(object)
  );
};

/**
 * Show the object inspector modal with detailed information about a physics object
 * @param {Object} object - Physics object to inspect
 * @param {string} type - Type of object (BlackHole, Star, Planet, etc.)
 */
const showObjectInspector = (object, type) => {
  // Check if splash screen is still active using both the global flag and our state variable
  if (!window.splashScreenEnded || window.isSplashActive) {
    debugLog(
      'Splash screen still active, completely ignoring showObjectInspector call'
    );
    return;
  }

  // Check if inspector element exists
  const objectInspector = document.getElementById('objectInspector');
  if (!objectInspector) {
    console.error('objectInspector element not found!');
    return;
  }

  // Check if we're already showing the same object
  if (
    state.inspector_open &&
    state.selectedObject &&
    state.selectedObject.object &&
    state.selectedObject.object.id === object.id &&
    state.selectedObject.type === type
  ) {
    debugLog('Inspector already open for this object, skipping');
    return;
  }

  // Store the current object for auto-updating
  state.selectedObject = { object, type };

  // If object appears in a near-circular, bound orbit around the dominant body, enable blue orbit overlay
  try {
    const centerCandidates = [
      ...bh_list,
      ...stars,
      ...neutron_stars,
      ...white_dwarfs,
      ...gas_giants,
    ];
    const G = SETTINGS.gravitational_constant;
    const obj = object;
    let primary = null;
    let maxInfluence = -Infinity;
    for (const b of centerCandidates) {
      if (!b || !b.alive || b === obj) continue;
      const dx = obj.pos.x - b.pos.x;
      const dy = obj.pos.y - b.pos.y;
      const r2 = Math.max(1e-6, dx * dx + dy * dy);
      const influence = (G * b.mass) / r2;
      if (influence > maxInfluence) {
        maxInfluence = influence;
        primary = b;
      }
    }
    if (primary) {
      const rx = obj.pos.x - primary.pos.x;
      const ry = obj.pos.y - primary.pos.y;
      const r = Math.max(1e-6, Math.hypot(rx, ry));
      const vCirc = Math.sqrt((G * primary.mass) / r);
      const vMag = Math.hypot(obj.vel.x, obj.vel.y);
      const dirTan = Math.atan2(ry, rx) + Math.PI / 2;
      const vIdeal = {
        x: vCirc * Math.cos(dirTan),
        y: vCirc * Math.sin(dirTan),
      };
      const dot = obj.vel.x * vIdeal.x + obj.vel.y * vIdeal.y;
      const denom = Math.max(1e-6, vMag * vCirc);
      const cosTheta = Math.max(-1, Math.min(1, dot / denom));
      const angErr = Math.acos(cosTheta);
      const speedRatio = vMag / vCirc;
      const angleTol =
        ((SETTINGS.sticky_dir_only_angle_deg || 15) * Math.PI) / 180;
      const speedTol = 0.2; // allow ~20% speed deviation
      const isBound = 0.5 * vMag * vMag - (G * primary.mass) / r < 0;
      if (
        isBound &&
        angErr <= angleTol &&
        speedRatio > 1 - speedTol &&
        speedRatio < 1 + speedTol
      ) {
        // Build one-loop circular path for overlay
        const samples = 240;
        const theta0 = Math.atan2(ry, rx);
        const loop = [];
        for (let i = 0; i <= samples; i++) {
          const t = i / samples;
          const th = theta0 + 2 * Math.PI * t;
          loop.push({
            x: primary.pos.x + r * Math.cos(th),
            y: primary.pos.y + r * Math.sin(th),
          });
        }
        state.inspectorOrbitOverlay.active = true;
        state.inspectorOrbitOverlay.points = loop;
      } else {
        state.inspectorOrbitOverlay.active = false;
        state.inspectorOrbitOverlay.points = [];
      }
    } else {
      state.inspectorOrbitOverlay.active = false;
      state.inspectorOrbitOverlay.points = [];
    }
  } catch {
    state.inspectorOrbitOverlay.active = false;
    state.inspectorOrbitOverlay.points = [];
  }

  // A guided lesson does its own reporting in its own panel, and the inspector
  // is a large floating card that lands squarely over the orbit the student has
  // just been asked to watch. Selection and the orbit overlay above still
  // happen - only the panel is withheld.
  if (inspectorSuppressed) return;

  const updateInspector = () => {
    if (!state.inspector_open || !state.selectedObject) return;

    // The selected object can be absorbed, merged away or culled while the
    // inspector is open. Without this the panel keeps polling a detached
    // object and shows a frozen ghost, and the mass slider still acts on it.
    if (!isObjectStillInSimulation(state.selectedObject.object)) {
      hideObjectInspector();
      return;
    }

    // Skip updates if slider is being dragged
    if (state.sliderDragging) {
      return;
    }

    const info = objectInfoFor(
      state.selectedObject.object,
      state.selectedObject.type
    );
    if (!info) {
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
    const currentObjectId =
      state.selectedObject && state.selectedObject.object
        ? String(state.selectedObject.object.id ?? 'unknown')
        : 'unknown';
    const sliderObjectId = existingMassSlider?.dataset?.objectId ?? 'unknown';
    const isNewObject =
      !existingMassSlider || sliderObjectId !== currentObjectId;

    // Don't recreate inspector if it's just a mass update (to preserve energy chart)
    // TODO: REMOVE - Energy chart preservation logic to be replaced
    const isMassUpdate =
      existingMassSlider &&
      state.selectedObject &&
      state.selectedObject.object &&
      sliderObjectId === currentObjectId &&
      Math.abs(
        parseFloat(existingMassSlider.value) - state.selectedObject.object.mass
      ) < 0.1;

    if (isNewObject && !isMassUpdate) {
      // Reset energy log when switching to a new object
      state.energyLog = [];
      const view = buildInspectorView(
        state.selectedObject.object,
        state.selectedObject.type,
        info
      );
      if (!view) return;
      paintInspectorHeader(view);
      detailsTabContent.innerHTML = renderDetails(view);

      // Set up mass slider event listeners
      setupMassSliderListeners();

      wireInspectorOverlayToggles();

      // Store object ID for future reference
      const newMassSlider = document.getElementById('massSlider');
      if (newMassSlider && state.selectedObject.object) {
        newMassSlider.dataset.objectId = currentObjectId;
      }
    } else if (isNewObject && isMassUpdate) {
      // Just update the mass slider value without recreating the inspector
      const existingMassSlider = document.getElementById('massSlider');
      if (existingMassSlider) {
        existingMassSlider.value = state.selectedObject.object.mass;
      }
    } else {
      // Ten times a second. Nothing is rebuilt: patchDetails walks the value
      // cells and writes only the ones whose text actually changed, so an open
      // "About this object", a focused control and a slider mid-drag all
      // survive. The old path replaced every row's innerHTML on every tick.
      const view = buildInspectorView(
        state.selectedObject.object,
        state.selectedObject.type,
        info
      );
      if (view) {
        paintInspectorHeader(view);
        if (!patchDetails(detailsTabContent, view)) {
          // The property list changed shape, which means the object became
          // something else. Rebuild rather than mismatch labels to values.
          detailsTabContent.innerHTML = renderDetails(view);
          setupMassSliderListeners();
          wireInspectorOverlayToggles();
        }
      }
    }

    // Update energy chart if energy tab is active
    const energyTab = document.querySelector(
      '.inspector-tab[data-tab="energy"]'
    );
    if (energyTab && energyTab.classList.contains('active')) {
      updateEnergyChart();
      updateCurrentEnergyValues();
    }
  };

  // Clear any existing update interval
  if (state.inspectorUpdateInterval) {
    clearInterval(state.inspectorUpdateInterval);
    state.inspectorUpdateInterval = null;
  }

  // Initial update
  updateInspector();

  // Update current energy values immediately (even if energy tab isn't active)
  updateCurrentEnergyValues();

  // Set up auto-update interval
  state.inspectorUpdateInterval = setInterval(updateInspector, 100); // Update 10 times per second

  // Remove inline hide styles so CSS takes over
  [
    'display',
    'opacity',
    'visibility',
    'pointerEvents',
    'position',
    'left',
    'top',
    'zIndex',
  ].forEach(prop => {
    objectInspector.style[prop] = '';
  });

  // Show the inspector
  objectInspector.classList.add('visible');

  // Ensure the showUI class is also present (added after splash screen ends)
  if (!objectInspector.classList.contains('showUI')) {
    objectInspector.classList.add('showUI');
  }

  state.inspector_open = true;

  // Clear anything a previous drag left behind, then dock. No transform is
  // applied at all - the old translate(-50%, -50%) centering is what the drag
  // code then had to undo on every mousedown.
  objectInspector.style.left = '';
  objectInspector.style.top = '';
  objectInspector.style.transform = '';
  dockInspector(objectInspector);
  layoutPinnedCards();

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
    updateCurrentEnergyValues();
  }, 100); // Small delay to ensure DOM elements are ready

  // Set up overlay minimize functionality
  setupOverlayMinimize();

  // The rail's "Selected object" option names the current selection, so it
  // changes whenever the selection does.
  paintFrameControls();
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
  // turn off orbit overlay when inspector closes
  state.inspectorOrbitOverlay.active = false;
  state.inspectorOrbitOverlay.points = [];
  // The equal-area overlay deliberately survives: it is a thing the user turned
  // on to look at, and closing the panel that switched it on is not a request
  // to stop looking. It clears itself instead when the orbit it describes stops
  // being the orbit the body is on. See checkAreaSweepValidity.

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
  paintFrameControls();
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

const handleInspectorBackdropClick = e => {
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

  inspectorHeader.addEventListener('touchstart', startDragTouch, {
    passive: false,
  }); // passive: false is required because startDragTouch calls preventDefault
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
  const detailsTab = document.querySelector(
    '.inspector-tab[data-tab="details"]'
  );
  const energyTabContent = document.getElementById('energyTab');
  const detailsTabContent = document.getElementById('detailsTab');

  if (!energyTab || !detailsTab || !energyTabContent || !detailsTabContent) {
    // Silently return instead of logging error - elements may not exist during initialization
    return;
  }

  debugLog('Setting up energy tab system');

  // Build energy tab HTML structure
  energyTabContent.innerHTML = renderEnergy();

  // Set up tab switching
  energyTab.addEventListener('click', () => {
    // The chart was built while this tab was hidden, so it measured a
    // zero-height parent. Now that it is visible, let it size itself.
    requestAnimationFrame(() => resizeChart());
    debugLog('Energy tab clicked');
    energyTab.classList.add('active');
    detailsTab.classList.remove('active');
    energyTabContent.classList.add('active');
    detailsTabContent.classList.remove('active');

    // Initialize chart if needed
    ensureChartReady();

    // Update current energy values immediately
    updateCurrentEnergyValues();

    // Update chart with current object data
    updateEnergyChart();

    // Start auto-refresh for this tab
    startAutoRefresh();

    // Force a chart update to ensure it's visible
    setTimeout(() => {
      if (state.selectedObject) {
        debugLog('Forcing chart update after tab activation');
        updateEnergyChart();
        updateCurrentEnergyValues();
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
    debugLog('Refresh button event listener attached');
  } else {
    console.warn('Refresh button not found during setup');
  }

  debugLog('Energy tab setup complete');

  // Add a global click handler as a fallback for the refresh button
  // This ensures the refresh button works even if the event listener wasn't properly attached
  document.addEventListener('click', event => {
    if (event.target && event.target.id === 'refreshEnergyChart') {
      debugLog('Refresh button clicked via global handler');
      handleRefreshChart();
    }
  });
};

/**
 * Ensure chart is initialized and ready
 */
const ensureChartReady = async () => {
  const canvas = document.getElementById('energyChart');
  if (!canvas || chartInitialized) return;

  // Chart.js is fetched the first time a chart is actually wanted rather than
  // on every page load. initChart() reads the global, so it has to wait for it.
  const { ensureChartJs } = await import('./chartjs.js');
  if (!(await ensureChartJs())) return;
  if (chartInitialized) return;

  debugLog('Initializing energy chart');
  if (initChart(canvas)) {
    chartInitialized = true;
    debugLog('Energy chart initialized successfully');
  } else {
    console.error('Failed to initialize energy chart');
  }
};

/**
 * Update the current energy values display
 */
const updateCurrentEnergyValues = () => {
  if (!state.selectedObject) {
    // Clear all energy value displays
    const elements = [
      'currentKineticEnergy',
      'currentPotentialEnergy',
      'currentTotalEnergy',
      'currentDataPoints',
    ];
    elements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = id === 'currentDataPoints' ? '0' : '0 J';
      }
    });
    return;
  }

  const objectId = state.selectedObject.object.id;
  const energyStats = getObjectEnergyStats(objectId);

  // Format energy values for display
  const formatEnergyValue = value => {
    if (value === 0) return '0 J';

    const absValue = Math.abs(value);
    if (absValue >= 1e6 || absValue < 1e-3) {
      return withUnit(value, 'J');
    } else if (absValue >= 1000) {
      return withUnit(value, 'J');
    } else if (absValue >= 1) {
      return withUnit(value, 'J');
    } else {
      return withUnit(value, 'J');
    }
  };

  // Update kinetic energy
  const kineticElement = document.getElementById('currentKineticEnergy');
  if (kineticElement && energyStats.latest) {
    kineticElement.textContent = formatEnergyValue(energyStats.latest.ke);
  }

  // Update potential energy
  const potentialElement = document.getElementById('currentPotentialEnergy');
  if (potentialElement && energyStats.latest) {
    potentialElement.textContent = formatEnergyValue(energyStats.latest.pe);
  }

  // Update total energy
  const totalElement = document.getElementById('currentTotalEnergy');
  if (totalElement && energyStats.latest) {
    totalElement.textContent = formatEnergyValue(energyStats.latest.total);
  }

  // Update data points count
  const dataPointsElement = document.getElementById('currentDataPoints');
  if (dataPointsElement) {
    dataPointsElement.textContent = energyStats.dataPoints.toString();
  }
};

/**
 * Update the energy chart with current object data
 */
const updateEnergyChart = () => {
  debugLog('updateEnergyChart called');

  if (!state.selectedObject) {
    debugLog('No selected object, skipping chart update');
    return;
  }

  const objectId = state.selectedObject.object.id;
  debugLog('Updating chart for object ID:', objectId);

  // Clear chart if switching to a different object
  if (currentObjectId !== null && currentObjectId !== objectId) {
    debugLog('Switching objects, clearing chart');
    clearChart();
  }

  currentObjectId = objectId;

  // Get energy history for the selected object
  const energyHistory = getObjectEnergyHistory(objectId);
  debugLog('Energy history length:', energyHistory.length);

  if (energyHistory.length === 0) {
    debugLog('No energy data available for object:', objectId);
    // Clear chart and show collecting message
    clearChart();
    showCollectingMessage();
    // Start auto-refresh to check for new data
    startAutoRefresh();
    return;
  }

  debugLog(
    'Updating chart with',
    energyHistory.length,
    'data points for object:',
    objectId
  );

  // Ensure chart is ready before updating
  ensureChartReady();

  // Worker-decimated update
  try {
    if (!window._chartWorker) {
      const workerUrl = new URL('./chartWorker.js', import.meta.url);
      window._chartWorker = new Worker(workerUrl, { type: 'module' });
      const desiredHz = SETTINGS.chart_update_hz || 8;
      window._chartWorker.postMessage({
        type: 'config',
        desiredHz,
        maxPoints: 200,
      });
      window._chartWorker.onmessage = evt => {
        if (evt.data && evt.data.type === 'update') {
          const payload = evt.data.data;
          // Schedule non-critical chart update in idle time to avoid jank
          const run = () => updateChart(payload, SETTINGS.chart_update_hz);
          if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(() => run());
          } else {
            setTimeout(run, 0);
          }
        }
      };
    }
    window._chartWorker.postMessage({ type: 'data', data: energyHistory });
  } catch {
    // Fallback: direct update if worker fails
    const run = () => updateChart(energyHistory, SETTINGS.chart_update_hz);
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => run());
    } else {
      setTimeout(run, 0);
    }
  }
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
    const chartContainer = energyTabContent.querySelector(
      '.energy-chart-container'
    );
    if (chartContainer) {
      chartContainer.parentNode.insertBefore(
        collectingMessage,
        chartContainer.nextSibling
      );
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

  const collectingMessage = energyTabContent.querySelector(
    '.collecting-message'
  );
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
      const energyTab = document.querySelector(
        '.inspector-tab[data-tab="energy"]'
      );
      if (energyTab && energyTab.classList.contains('active')) {
        updateEnergyChart();
        updateCurrentEnergyValues();
      }
    }
  }, AUTO_REFRESH_INTERVAL);

  // Update refresh button to show auto-refresh is active
  const refreshButton = document.getElementById('refreshEnergyChart');
  if (refreshButton) {
    refreshButton.title = t('chart.autoRefresh');
    refreshButton.classList.add('auto-refresh-active');
  }

  debugLog('Auto-refresh started for energy chart');
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
      refreshButton.title = t('chart.refresh');
      refreshButton.classList.remove('auto-refresh-active');
    }

    debugLog('Auto-refresh stopped for energy chart');
  }
};

/**
 * Handle chart refresh
 */
const handleRefreshChart = () => {
  debugLog('Manual chart refresh requested');

  // Ensure chart is ready before updating
  ensureChartReady();

  // Update the chart
  updateEnergyChart();

  // Update current energy values
  updateCurrentEnergyValues();

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
    const objectId = state.selectedObject
      ? state.selectedObject.object.id
      : 'unknown';
    link.download = `energy-chart-${objectId}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    debugLog('Energy chart exported successfully');
  } catch (error) {
    console.error('Failed to export energy chart:', error);
    alert('Failed to export chart. Please try again.');
  }
};

// The inspector once had a minimize button. Nothing has referenced
// .inspector-minimize in the markup, the script or the stylesheet for some
// time, so the class checks that used to guard against dragging a collapsed
// panel guarded against a state that can no longer occur. The cursor is a
// stylesheet concern now.
//
// Note this is only the inspector's dead copy: setOverlayMinimized below still
// collapses the HUD readout, and that one is reachable.

const startDrag = e => {
  e.preventDefault();

  const objectInspector = document.getElementById('objectInspector');

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

  // Pin the panel to where it already is before switching to left/top control.
  // There is no transform to cancel any more, but the right/bottom anchors from
  // the stylesheet have to give way or the panel fights the drag.
  objectInspector.style.left = initialLeft + 'px';
  objectInspector.style.top = initialTop + 'px';
  objectInspector.style.right = 'auto';
  objectInspector.style.bottom = 'auto';
};

const startDragTouch = e => {
  // A touch that landed on one of the header's own buttons is not a drag, and
  // treating it as one broke every control up there on a phone. Calling
  // preventDefault() on touchstart cancels the click the browser would have
  // synthesised, so the close, pin and delete buttons received the tap and did
  // nothing at all - on desktop the same handler is harmless, because
  // preventDefault() on mousedown does not cancel a click, which is why this
  // went unnoticed.
  if (e.target?.closest?.('button, a, input, select, textarea')) return;

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

  // Pin the panel to where it already is before switching to left/top control.
  // There is no transform to cancel any more, but the right/bottom anchors from
  // the stylesheet have to give way or the panel fights the drag.
  objectInspector.style.left = initialLeft + 'px';
  objectInspector.style.top = initialTop + 'px';
  objectInspector.style.right = 'auto';
  objectInspector.style.bottom = 'auto';
};

const drag = e => {
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

const dragTouch = e => {
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

  // The whole collapsed panel is the target for re-opening, not just the chip
  overlay.addEventListener('click', e => {
    if (!overlay.classList.contains('minimized')) return;
    if (minimizeBtn.contains(e.target)) return;
    setOverlayMinimized(overlay, minimizeBtn, false);
  });

  setOverlayMinimized(
    overlay,
    minimizeBtn,
    overlay.classList.contains('minimized')
  );
};

const toggleOverlayMinimize = e => {
  e.preventDefault();
  e.stopPropagation();

  const overlay = document.getElementById('overlay');
  const minimizeBtn = document.getElementById('overlayMinimize');

  if (!overlay || !minimizeBtn) return;

  const isMinimized = overlay.classList.contains('minimized');

  setOverlayMinimized(overlay, minimizeBtn, !isMinimized);
};

/**
 * Apply the minimised/expanded state to the readout panel and its control.
 * The button carries a word as well as a glyph - a bare "−" gave no clue that
 * the panel could be collapsed, and the collapsed state was an unlabeled box.
 * @param {HTMLElement} overlay - The overlay panel
 * @param {HTMLElement} btn - The minimise/expand button
 * @param {boolean} minimized - Target state
 */
const setOverlayMinimized = (overlay, btn, minimized) => {
  overlay.classList.toggle('minimized', minimized);
  const glyph = minimized ? '▸' : '▾';
  const label = minimized ? t('readout.toggle.show') : t('readout.toggle.hide');
  btn.innerHTML =
    `<span aria-hidden="true">${glyph}</span>` +
    `<span class="overlay-toggle-label">${label}</span>`;
  btn.title = minimized
    ? t('readout.toggle.show.hint')
    : t('readout.toggle.hide.hint');
  btn.setAttribute('aria-expanded', String(!minimized));
  btn.setAttribute(
    'aria-label',
    minimized ? t('readout.toggle.show.label') : t('readout.toggle.hide.hint')
  );
};
/**
 * Create a mass adjustment slider for the object inspector
 * @param {Object} object - The physics object
 * @param {string} type - The type of object
 * @returns {string} HTML string for the mass slider
 */
/**
 * Measure what is on screen and move the inspector out of its way.
 *
 * The decision itself lives in computeDockPosition; this half only gathers the
 * rectangles. The bottom-sheet layout under 620px is left alone: there the
 * panel is meant to cover things.
 *
 * @param {HTMLElement} panel - The inspector element
 */
const dockInspector = panel => {
  if (window.innerWidth <= 620) return;

  const visible = sel => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  };

  const { left, top, maxHeight } = computeDockPosition({
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    panelWidth: panel.offsetWidth,
    panelHeight: panel.offsetHeight,
    hud: visible('#overlay'),
    rail: visible('#mainControls'),
  });

  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.style.right = 'auto';
  panel.style.bottom = 'auto';
  // Never taller than the stylesheet allows; only shorter, when the position
  // it was given leaves less room than that.
  panel.style.maxHeight = `min(72vh, 640px, ${maxHeight}px)`;
};

// --- Reference-frame switcher -------------------------------------------------
// The rail control and the inspector row are two doors into the same state, so
// both are driven from one subscription rather than each trying to keep the
// other in step.

/**
 * The name to show for a frame, and what choosing it does.
 *
 * @param {{mode: string, objectId: ?number}} frame - The frame
 * @returns {{value: string, note: string, active: boolean}} What the rail shows
 */
const describeFrame = frame => {
  if (frame.mode === BARYCENTER) {
    return {
      value: BARYCENTER,
      note: 'Positions relative to the system\u2019s center of mass. It does not sit inside the largest body.',
      active: true,
    };
  }
  if (frame.mode === OBJECT) {
    const body = barycenterBodies().find(b => b.id === frame.objectId);
    const name = body?.name || 'the selected object';
    return {
      value: OBJECT,
      note: `Positions and trails as seen from ${name}, which now sits still.`,
      active: true,
    };
  }
  return {
    value: WORLD,
    note: 'Positions as the scenario defines them.',
    active: false,
  };
};

/** Bring the rail control and the inspector row in line with the frame. */
const paintFrameControls = () => {
  const frame = frameState();
  const shown = describeFrame(frame);

  const select = document.getElementById('referenceFrameSelect');
  if (select) {
    const objectOption = select.querySelector('option[value="object"]');
    if (objectOption) {
      // "Selected object" is only a choice when there is one. Offering it with
      // nothing selected would set a frame with no origin.
      const sel = state.selectedObject?.object;
      objectOption.disabled = !sel;
      objectOption.textContent = sel
        ? `Selected: ${sel.name || 'object'}`
        : 'Selected object';
    }
    select.value = shown.value;
  }

  const note = document.getElementById('referenceFrameNote');
  if (note) {
    // Only shown while a frame is active. It is a reminder that every number on
    // screen is now measured against something other than the scenario's own
    // coordinates, and in the world frame there is nothing to remind anyone of.
    note.textContent = shown.note;
    note.hidden = !shown.active;
  }

  const btn = document.getElementById('frameToggleBtn');
  if (btn) {
    const sel = state.selectedObject?.object;
    const on = !!sel && frame.mode === OBJECT && frame.objectId === sel.id;
    btn.setAttribute('data-state', on ? 'on' : 'off');
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
    btn.textContent = on ? 'On' : 'Off';
  }
};

/** Wire the rail's frame selector. */
const setupReferenceFrameControl = () => {
  const select = document.getElementById('referenceFrameSelect');
  if (select) {
    select.addEventListener('change', () => {
      const value = select.value;
      if (value === OBJECT) {
        const sel = state.selectedObject?.object;
        setFrame(sel ? OBJECT : WORLD, sel ? sel.id : null);
      } else {
        setFrame(value === BARYCENTER ? BARYCENTER : WORLD);
      }
    });
  }
  onFrameChange(paintFrameControls);
  paintFrameControls();
};

// --- Pinned comparison cards ------------------------------------------------
// One inspector answers "what is this?". Two answer "how do these differ?",
// which is the question a student actually has when they are looking at two
// planets. Pinning takes a copy of the current object's numbers and leaves it
// on screen while the main inspector moves on to whatever is selected next.
//
// The cards are read-only by design: see renderPinnedCard for why a second mass
// slider would collide with the first.
const pinnedInspectors = [];
let pinnedUpdateInterval = null;

/**
 * Lay the pinned cards out beside the inspector.
 *
 * Beside rather than below, because that is the arrangement the comparison
 * needs: two sets of numbers at the same height, read across. Stacking them
 * under the panel put the first card's bottom edge 200px past the bottom of
 * the window.
 *
 * Cards fill a column downward from the panel's top edge and start a new column
 * further left when the next one would not fit, so pinning a fourth card never
 * pushes anything off screen.
 */
const layoutPinnedCards = () => {
  const host = document.getElementById('pinnedInspectors');
  const main = document.getElementById('objectInspector');
  if (!host) return;

  const GAP = 10;
  const CARD_W = 300;
  const open = main && getComputedStyle(main).display !== 'none';

  // Under 620px the inspector is a bottom sheet, so there is no "beside" to
  // work with: the cards take the top of the screen and the sheet keeps the
  // bottom. Anchoring to the sheet would stack them straight onto it.
  if (window.innerWidth <= 620) {
    let y = GAP;
    for (const pin of pinnedInspectors) {
      if (pin.placed) continue;
      pin.el.style.left = `${GAP}px`;
      pin.el.style.top = `${Math.round(y)}px`;
      y += pin.el.offsetHeight + GAP;
    }
    return;
  }

  const anchor = open ? main.getBoundingClientRect() : null;

  // With the panel open the cards start to its left; with it closed they take
  // the space the panel would have occupied.
  let right = anchor ? anchor.left - GAP : window.innerWidth - GAP;
  const topStart = anchor ? anchor.top : 96;
  let top = topStart;

  for (const pin of pinnedInspectors) {
    if (pin.placed) continue;
    const h = pin.el.offsetHeight;
    if (top !== topStart && top + h > window.innerHeight - GAP) {
      // This column is full: start another one to the left.
      right -= CARD_W + GAP;
      top = topStart;
    }
    pin.el.style.left = `${Math.round(Math.max(GAP, right - CARD_W))}px`;
    pin.el.style.top = `${Math.round(
      Math.max(GAP, Math.min(top, window.innerHeight - h - GAP))
    )}px`;
    top += h + GAP;
  }
};

/** Remove a pinned card. @param {object} pin - The pin record */
const unpinInspector = pin => {
  const i = pinnedInspectors.indexOf(pin);
  if (i >= 0) pinnedInspectors.splice(i, 1);
  pin.el.remove();
  if (!pinnedInspectors.length && pinnedUpdateInterval) {
    clearInterval(pinnedUpdateInterval);
    pinnedUpdateInterval = null;
  }
  layoutPinnedCards();
};

/** Pin the object the inspector is currently showing. */
const pinCurrentObject = () => {
  const sel = state.selectedObject;
  if (!sel?.object) return;
  // Pinning the same body twice would just stack two identical cards.
  if (pinnedInspectors.some(p => p.object === sel.object)) return;

  const info = objectInfoFor(sel.object, sel.type);
  const view = buildInspectorView(sel.object, sel.type, info);
  if (!view) return;

  const el = document.createElement('div');
  el.className = 'insp-pin';
  el.innerHTML = renderPinnedCard(view);
  document.getElementById('pinnedInspectors')?.appendChild(el);

  const pin = { el, object: sel.object, type: sel.type };
  pinnedInspectors.push(pin);
  el.querySelector('[data-pin-close]')?.addEventListener('click', () =>
    unpinInspector(pin)
  );
  makePinDraggable(pin);
  // The main inspector's ticker stops when it closes. A pinned card has to
  // outlive that, so the cards run their own.
  if (!pinnedUpdateInterval) {
    pinnedUpdateInterval = setInterval(updatePinnedInspectors, 100);
  }
  layoutPinnedCards();
};

/**
 * Let a pinned card be dragged by its header.
 *
 * Once dragged it stops taking part in the automatic column layout: the user
 * has said where they want it, and having it jump back the next time another
 * card is pinned would undo that.
 *
 * @param {object} pin - The pin record
 */
const makePinDraggable = pin => {
  const header = pin.el.querySelector('.insp-pin-header');
  if (!header) return;
  header.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    const rect = pin.el.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    pin.placed = true;
    const move = ev => {
      pin.el.style.left = `${Math.round(
        Math.min(
          Math.max(4, ev.clientX - offsetX),
          window.innerWidth - rect.width - 4
        )
      )}px`;
      pin.el.style.top = `${Math.round(
        Math.min(Math.max(4, ev.clientY - offsetY), window.innerHeight - 40)
      )}px`;
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    e.preventDefault();
  });
};

/**
 * Refresh every pinned card, and drop any whose object has left the world.
 *
 * Called from the same tick as the main inspector, so a pinned card is as live
 * as the panel it was copied from.
 */
const updatePinnedInspectors = () => {
  if (!pinnedInspectors.length) return;
  for (const pin of [...pinnedInspectors]) {
    if (!isObjectStillInSimulation(pin.object)) {
      unpinInspector(pin);
      continue;
    }
    const info = objectInfoFor(pin.object, pin.type);
    const view = buildInspectorView(pin.object, pin.type, info);
    if (!view) continue;
    if (!patchDetails(pin.el, view)) {
      pin.el.innerHTML = renderPinnedCard(view);
      pin.el
        .querySelector('[data-pin-close]')
        ?.addEventListener('click', () => unpinInspector(pin));
    }
  }
};

/**
 * The per-type info function, in one place.
 *
 * Three separate switch statements used to spell this mapping out character for
 * character: the live tick, the transformation path and the mass-change path.
 * Adding a ninth object type meant remembering all three.
 *
 * @param {object} object - The body
 * @param {string} type - Its type name
 * @returns {object|null} Info for the inspector
 */
const objectInfoFor = (object, type) => {
  switch (type) {
    case 'BlackHole':
      return getBlackHoleInfo(object);
    case 'Star':
      return getStarInfo(object);
    case 'NeutronStar':
      return getNeutronStarInfo(object);
    case 'WhiteDwarf':
      return getWhiteDwarfInfo(object);
    case 'Planet':
      return getPlanetInfo(object);
    case 'GasGiant':
      return getGasGiantInfo(object);
    case 'Comet':
      return getCometInfo(object);
    case 'Asteroid':
      return getAsteroidInfo(object);
    case 'Galaxy':
      return getGalaxyInfo(object);
    default:
      return null;
  }
};

/**
 * Attach the overlay toggles after a rebuild.
 *
 * Both toggles used to be wired twice over, once in the selection path and
 * once in the transformation path, each with its own copy of the handler and
 * an extra click target on a header row that no longer exists. One button, one
 * handler, one place.
 */
const wireInspectorOverlayToggles = () => {
  const hzBtn = document.getElementById('hzToggleBtn');
  if (hzBtn) {
    hzBtn.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      const obj = state.selectedObject?.object;
      if (!obj) return;
      const next = !obj.showHabitableZone;
      obj.showHabitableZone = next;
      hzBtn.setAttribute('data-state', next ? 'on' : 'off');
      hzBtn.setAttribute('aria-checked', next ? 'true' : 'false');
      hzBtn.textContent = next ? 'On' : 'Off';
    };
  }

  const frameBtn = document.getElementById('frameToggleBtn');
  if (frameBtn) {
    frameBtn.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      const obj = state.selectedObject?.object;
      if (!obj) return;
      const current = frameState();
      const isOn = current.mode === OBJECT && current.objectId === obj.id;
      setFrame(isOn ? WORLD : OBJECT, isOn ? null : obj.id);
    };
  }

  const sweepBtn = document.getElementById('sweepToggleBtn');
  if (sweepBtn) {
    sweepBtn.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      const obj = state.selectedObject?.object;
      if (!obj) return;
      const isOn =
        state.areaSweepOverlay.active &&
        state.areaSweepOverlay.objectId === obj.id;
      const set = on => {
        sweepBtn.setAttribute('data-state', on ? 'on' : 'off');
        sweepBtn.setAttribute('aria-checked', on ? 'true' : 'false');
        sweepBtn.textContent = on ? 'On' : 'Off';
      };
      if (isOn) {
        state.areaSweepOverlay.active = false;
        state.areaSweepOverlay.wedges = [];
        state.areaSweepOverlay.orbitPoints = [];
        set(false);
        return;
      }
      const data = computeAreaSweep(obj);
      if (!data) return;
      state.areaSweepOverlay.active = true;
      state.areaSweepOverlay.parentId = data.parentId;
      state.areaSweepOverlay.parent = data.parent;
      state.areaSweepOverlay.objectId = data.objectId;
      state.areaSweepOverlay.wedges = data.wedges;
      state.areaSweepOverlay.orbitPoints = data.orbitPoints;
      set(true);
    };
  }
};

/**
 * Resolve everything the inspector needs to draw, for one object.
 *
 * The panel used to be built twice from two near-identical blobs of string
 * concatenation: once when a new object was selected, and again when a mass
 * change transformed one object type into another. The two had already drifted
 * apart. This is the one place that decides what the inspector shows.
 *
 * @param {object} object - The selected body
 * @param {string} type - Its type name
 * @param {object} info - Output of the per-type info function
 * @returns {object|null} A view model for js/objectInspector.js
 */
const buildInspectorView = (object, type, info) => {
  if (!info) return null;
  const identity = splitIdentity(info.icon, info.title);

  // Ordinary objects get one ungrouped table; a section heading for four rows
  // costs more vertical space than it saves. Bodies with a lot to say - black
  // holes especially - get their extras grouped so the list stays scannable.
  const rows = info.stats.map((stat, i) => ({
    key: `s${i}`,
    label: String(stat.label).replace(/:\s*$/, ''),
    value: stat.value,
    tooltip: getStatTooltip(stat.label, type),
  }));

  // While a frame is active, the world-frame speed above is true but not what
  // the picture is showing: the view has the origin sitting still. Rather than
  // silently changing what "Velocity" means, add the relative one beside it and
  // say in the label what it is relative to.
  const originVel = frameOriginVelocity(barycenterBodies());
  const frameOrigin = resolveFrameOrigin(barycenterBodies());
  const frameLabel = () => {
    const frame = frameState();
    return frame.mode === BARYCENTER
      ? 'barycenter'
      : barycenterBodies().find(b => b.id === frame.objectId)?.name ||
          'the frame';
  };

  // Where the body is in the frame, not in the scenario's coordinates. Without
  // these two rows the frame is something you can only look at: the picture
  // shows Mars looping and the numbers beside it still describe a circle round
  // the Sun. A direction and a distance are also what an observer on the origin
  // body would actually record, which is what makes them the measurable ones.
  if (frameOrigin && object !== null && object.pos) {
    const dx = object.pos.x - frameOrigin.now.x;
    const dy = object.pos.y - frameOrigin.now.y;
    const sep = Math.hypot(dx, dy);
    if (sep > 0) {
      const against = frameLabel();
      let bearing = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (bearing < 0) bearing += 360;
      rows.push({
        key: 'frameSeparation',
        label: `Distance from ${against}`,
        value: formatDistance(sep),
        tooltip:
          'How far this body is from the reference frame\u2019s origin right now.',
      });
      rows.push({
        key: 'frameBearing',
        label: `Direction from ${against}`,
        value: `${bearing.toFixed(1)}\u00b0`,
        tooltip:
          'Which way this body lies as seen from the frame\u2019s origin, measured anticlockwise from the positive x axis. Watch this number rather than the picture to catch the moment a body reverses direction.',
      });
    }
  }

  if (originVel && object.vel) {
    const against = frameLabel();
    const relative = Math.hypot(
      object.vel.x - originVel.x,
      object.vel.y - originVel.y
    );
    rows.push({
      key: 'frameRelativeSpeed',
      label: `Speed vs ${against}`,
      value: formatSpeed(relative),
      tooltip:
        'How fast this body is moving in the reference frame the view is currently in. The velocity above is measured in the scenario\u2019s own coordinates and does not change when the frame does.',
    });
  }

  const groups =
    rows.length > 9
      ? [{ rows: rows.slice(0, 6) }, { title: 'More', rows: rows.slice(6) }]
      : [{ rows }];

  const overlays = [];
  if (type === 'Star') {
    overlays.push({
      id: 'hzToggleBtn',
      label: t('overlay.habitableZone'),
      on: !!object.showHabitableZone,
      help: 'The range of orbital distances where a rocky planet with a suitable atmosphere could hold liquid water. Inside it is where to look, not a measurement that a world is habitable. Edges follow Kopparapu et al. (2013) from this star\u2019s luminosity and temperature.',
    });
  }
  // Every body can host a frame, so this row is unconditional. It is the one
  // control that changes what all the other numbers on screen mean, which is
  // why it says so in its own help text rather than only in the rail.
  overlays.push({
    id: 'frameToggleBtn',
    label: t('overlay.referenceFrame'),
    on: frameState().mode === OBJECT && frameState().objectId === object.id,
    help: 'Re-express every position, and every trail, as this body would see them. Unlike Follow Mode, which only moves the camera, this redraws the recorded paths: put the Solar System into Earth\u2019s frame and Mars traces a loop that doubles back on itself.',
  });

  const sweepScenarios = [
    'Solar System',
    'Earth-Moon System',
    "Kepler's 2nd Law",
  ];
  const orbitingTypes = ['Planet', 'GasGiant', 'Asteroid', 'Comet'];
  if (
    orbitingTypes.includes(type) &&
    sweepScenarios.includes(current_scenario_name)
  ) {
    overlays.push({
      id: 'sweepToggleBtn',
      label: t('overlay.equalAreaSweep'),
      on:
        state.areaSweepOverlay.active &&
        state.areaSweepOverlay.objectId === object.id,
      help: 'Kepler\u2019s second law, drawn. Each wedge covers the same amount of time: thin and long near the star where the object moves fast, wide and short far away where it moves slowly. The areas are equal.',
    });
  }

  return {
    icon: identity.icon,
    name: identity.name,
    kind: String(type || '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toUpperCase(),
    mass: massControlModel(object, type),
    groups,
    overlays,
    about: info.description || '',
  };
};

/**
 * Write the identity into the header.
 *
 * @param {object} view - The view model
 */
const paintInspectorHeader = view => {
  const icon = document.getElementById('inspectorIcon');
  const title = document.getElementById('inspectorTitle');
  const kind = document.getElementById('inspectorKind');
  if (icon && icon.textContent !== view.icon) icon.textContent = view.icon;
  if (title && title.textContent !== view.name) {
    title.textContent = view.name;
    title.title = view.name;
  }
  if (kind && kind.textContent !== view.kind) kind.textContent = view.kind;
};

const massControlModel = (object, type) => {
  debugLog('Creating mass slider for:', type, object);
  let currentMass, minMass, maxMass, massUnit, massLabel;

  switch (type) {
    case 'BlackHole':
      currentMass = object.mass / SOLAR_MASS_UNIT;
      minMass = 0.1;
      maxMass = 1000;
      massUnit = 'M<sub class="solar-sub">\u2609</sub>';
      massLabel = 'Object Mass';
      break;
    case 'Star':
      currentMass = object.massInSuns || object.mass / SOLAR_MASS_UNIT;
      minMass = 0.08; // Lower minimum to allow very low mass stars
      maxMass = 100;
      massUnit = 'M<sub class="solar-sub">\u2609</sub>';
      massLabel = 'Object Mass';
      break;
    case 'NeutronStar':
      currentMass = object.massInSuns || object.mass / SOLAR_MASS_UNIT;
      minMass = 1.0;
      maxMass = 3.0;
      massUnit = 'M<sub class="solar-sub">\u2609</sub>';
      massLabel = 'Object Mass';
      break;
    case 'WhiteDwarf':
      currentMass = object.massInSuns || object.mass / SOLAR_MASS_UNIT;
      minMass = 0.1;
      maxMass = 1.4;
      massUnit = 'M<sub class="solar-sub">\u2609</sub>';
      massLabel = 'Object Mass';
      break;
    case 'Planet':
      currentMass = object.massInEarths || object.mass / EARTH_MASS_UNIT;
      minMass = 0.01;
      maxMass = 10;
      massUnit = 'M<sub class="solar-sub">\u2295</sub>';
      massLabel = 'Object Mass';
      break;
    case 'GasGiant':
      currentMass = object.massInJupiters || object.mass / JUPITER_MASS_UNIT;
      minMass = 0.1;
      maxMass = 100; // Extended to allow transformation to star (threshold is 80 M♃)
      massUnit = 'M<sub class="solar-sub">\u2643</sub>';
      massLabel = 'Object Mass';
      break;
    case 'Asteroid':
      currentMass = object.mass / EARTH_MASS_UNIT;
      minMass = 0.0001;
      maxMass = 0.1;
      massUnit = 'M<sub class="solar-sub">\u2295</sub>';
      massLabel = 'Object Mass';
      break;
    case 'Comet':
      currentMass = object.massInComets ?? object.mass / HALLEY_MASS_UNIT;
      minMass = 0.001;
      maxMass = 1.0;
      massUnit = 'C';
      massLabel = 'Object Mass';
      break;
    default:
      return null;
  }

  // Returns a view model rather than markup: js/objectInspector.js owns the
  // HTML now, and the ranges and units are the part that belongs here, next to
  // the object types they describe. massLabel is no longer rendered - the
  // control is labelled "Mass" in one compact row - but the switch above still
  // sets it, so it is read here to keep the linter honest about the branch.
  void massLabel;
  return {
    objectId: object.id ?? 'unknown',
    min: minMass,
    max: maxMass,
    step: (maxMass - minMass) / 100,
    value: currentMass,
    display: `${formatNumber(currentMass, { sig: 3 })} ${massUnit}`,
  };
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
    if (!isFinite(newMass) || newMass <= 0) return;
    const object = state.selectedObject.object;
    const type = state.selectedObject.type;
    // Editing a mass by hand puts the world beyond what its seed rebuilds.
    markWorldTouched();

    // Skip mass update if we're in the middle of a transformation
    if (state.isTransforming) {
      return;
    }

    // Update the object's mass and check for transformation
    const newType = updateObjectMass(object, type, newMass);

    // Clear the energy chart since mass change invalidates energy history
    // This ensures the chart shows fresh data with the new mass
    if (chartInitialized) {
      debugLog('Clearing energy chart due to mass change');
      clearChart();
      showCollectingMessage();
    }

    // If object type changed, refresh the entire inspector and stop processing
    if (newType && newType !== type) {
      debugLog(`Object transformed from ${type} to ${newType}!`);

      // Set transformation flag to prevent mass updates during the process
      state.isTransforming = true;

      // Update the selected object type
      state.selectedObject.type = newType;

      // Reset the slider value to prevent immediate further transformation
      // For gas giant to star transformation, set slider to the star's actual mass
      if (type === 'GasGiant' && newType === 'Star') {
        // Use the new star object, not the old gas giant object
        const starObject = state.selectedObject.object;
        const massInSolarMasses =
          starObject.massInSuns || starObject.mass / SOLAR_MASS_UNIT;
        // Temporarily set the slider value to the correct star mass
        setTimeout(() => {
          const newSlider = document.getElementById('massSlider');
          if (newSlider) {
            newSlider.value = massInSolarMasses;
            const massValueDisplay =
              document.getElementById('massValueDisplay');
            if (massValueDisplay) {
              massValueDisplay.innerHTML = solarHTML(
                massInSolarMasses.toFixed(3)
              );
            }
          }
        }, 100);
      }

      // Refresh the inspector with new object type
      const inspectorContent = document.getElementById('inspectorContent');
      if (inspectorContent) {
        // A mass change turned this object into something else. Same builder,
        // same renderer as a fresh selection: this path used to carry its own
        // copy of the markup and the two had already drifted apart.
        const info = objectInfoFor(state.selectedObject.object, newType);
        if (!info) return;

        const view = buildInspectorView(
          state.selectedObject.object,
          newType,
          info
        );
        const detailsTabContent = document.getElementById('detailsTab');
        if (view && detailsTabContent) {
          paintInspectorHeader(view);
          detailsTabContent.innerHTML = renderDetails(view);
          setupMassSliderListeners();
          wireInspectorOverlayToggles();
        }

        // Energy tab should still be intact since we only updated details tab
        // Just ensure chart is ready for the new object
        if (chartInitialized) {
          debugLog('Ensuring chart is ready for transformed object');
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
          massUnit = 'M<sub class="solar-sub">\u2609</sub>';
          break;
        case 'Planet':
        case 'Asteroid':
          massUnit = 'M<sub class="solar-sub">\u2295</sub>';
          break;
        case 'GasGiant':
          massUnit = 'M<sub class="solar-sub">\u2643</sub>';
          break;
        case 'Comet':
          massUnit = 'C';
          break;
      }

      // massUnit carries <sub> markup, so this must be innerHTML - textContent
      // escaped it and rendered the tags literally.
      massValueDisplay.innerHTML = `${newMass.toFixed(3)} ${massUnit}`;

      // Update the stats display to reflect the new mass
      const inspectorContent = document.getElementById('inspectorContent');
      if (inspectorContent && state.selectedObject) {
        const info = objectInfoFor(
          state.selectedObject.object,
          state.selectedObject.type
        );
        if (!info) return;

        // Values only, through the same patcher the live tick uses. This block
        // used to write the old .stat-row markup by hand, which stopped
        // matching the DOM the moment the panel was redesigned.
        const view = buildInspectorView(
          state.selectedObject.object,
          state.selectedObject.type,
          info
        );
        const detailsTabContent = document.getElementById('detailsTab');
        if (view && detailsTabContent) {
          paintInspectorHeader(view);
          if (!patchDetails(detailsTabContent, view)) {
            detailsTabContent.innerHTML = renderDetails(view);
            setupMassSliderListeners();
            wireInspectorOverlayToggles();
          }
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
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(
      `Clearing energy history for object ${object.id} due to mass change`
    );
    clearObjectEnergyHistory(object.id);
  }

  switch (type) {
    case 'BlackHole':
      object.mass = newMass * SOLAR_MASS_UNIT;
      object.updateRadius(); // Update Schwarzschild radius
      break;
    case 'Star':
      debugLog(`DEBUG: Star mass update: newMass = ${newMass} solar masses`);
      object.mass = newMass * SOLAR_MASS_UNIT;
      object.massInSuns = newMass;
      debugLog(
        `DEBUG: Star mass updated: mass = ${object.mass} units, massInSuns = ${object.massInSuns}`
      );
      // Recalculate star properties based on mass
      object.radius = Math.pow(newMass, 0.8) * STAR_OBJ_RADIUS;
      object.temperature = 3000 + (newMass - 0.2) * 4000;
      object.luminosity = Math.pow(newMass, 3.5);

      // Check if star should become a black hole (mass > 20 M☉)
      if (newMass > 20.0) {
        debugLog(
          `DEBUG: Star mass ${newMass} exceeds black hole threshold 20.0 - transforming to black hole`
        );
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
      object.radius = Math.max(
        WHITE_DWARF_RADIUS * Math.pow(newMass, -0.33),
        2
      );

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
      object.mass = newMass * JUPITER_MASS_UNIT;
      object.massInJupiters = newMass;
      object.massInEarths = newMass * EARTH_MASSES_PER_JUPITER_MASS;
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
      // The slider works in Earth masses, so the Ceres count the class carries
      // has to be recomputed from it. Leaving it behind is how a body ends up
      // gravitating as one thing and being labelled as another.
      object.massInCeres = object.mass / CERES_MASS_UNIT;
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
      // Halley masses to simulation units. This was a second hardcoded copy of
      // the same wrong 0.1 the Comet constructor carried.
      object.mass = newMass * HALLEY_MASS_UNIT;
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
const transformStarToBlackHole = object => {
  debugLog('Star transforming into black hole!');
  // Preserve position and velocity
  const pos = { x: object.pos.x, y: object.pos.y };
  const vel = { x: object.vel.x, y: object.vel.y };
  const mass = object.mass;

  // Clear energy history for the old object before transformation
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(`Clearing energy history for transforming star ${object.id}`);
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
const transformNeutronStarToBlackHole = object => {
  debugLog('Neutron star transforming into black hole!');
  const pos = { x: object.pos.x, y: object.pos.y };
  const vel = { x: object.vel.x, y: object.vel.y };
  const mass = object.mass;

  // Clear energy history for the old object before transformation
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(
      `Clearing energy history for transforming neutron star ${object.id}`
    );
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
const transformWhiteDwarfToNeutronStar = object => {
  debugLog('White dwarf transforming into neutron star!');
  const pos = { x: object.pos.x, y: object.pos.y };
  const vel = { x: object.vel.x, y: object.vel.y };
  const mass = object.mass;

  // Clear energy history for the old object before transformation
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(
      `Clearing energy history for transforming white dwarf ${object.id}`
    );
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
const transformPlanetToGasGiant = object => {
  debugLog('Planet transforming into gas giant!');
  const pos = { x: object.pos.x, y: object.pos.y };
  const vel = { x: object.vel.x, y: object.vel.y };
  const mass = object.mass / JUPITER_MASS_UNIT; // Convert to Jupiter masses

  // Clear energy history for the old object before transformation
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(`Clearing energy history for transforming planet ${object.id}`);
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
const transformGasGiantToStar = object => {
  debugLog('Gas giant transforming into star!');
  const pos = { x: object.pos.x, y: object.pos.y };
  const vel = { x: object.vel.x, y: object.vel.y };

  // Clear energy history for the old object before transformation
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(`Clearing energy history for transforming gas giant ${object.id}`);
    clearObjectEnergyHistory(object.id);
  }

  // Jupiter masses to solar masses. Both conversions run off the shared
  // constants, so the transformation conserves gravitational mass exactly;
  // with the old 50-units-per-Jupiter figure it silently shed 98% of it.
  const massInJupiters =
    object.massInJupiters || object.mass / JUPITER_MASS_UNIT;
  const massInSolarMasses = massInJupiters / JUPITER_MASSES_PER_SOLAR_MASS;

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
const transformAsteroidToPlanet = object => {
  debugLog('Asteroid transforming into planet!');
  const pos = { x: object.pos.x, y: object.pos.y };
  const vel = { x: object.vel.x, y: object.vel.y };
  const mass = object.mass / EARTH_MASS_UNIT;

  // Clear energy history for the old object before transformation
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(`Clearing energy history for transforming asteroid ${object.id}`);
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
const transformCometToAsteroid = object => {
  debugLog('Comet transforming into asteroid!');
  const pos = { x: object.pos.x, y: object.pos.y };
  const vel = { x: object.vel.x, y: object.vel.y };

  // Clear energy history for the old object before transformation
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(`Clearing energy history for transforming comet ${object.id}`);
    clearObjectEnergyHistory(object.id);
  }

  // Built at the mass it already had, in the unit the class counts in, rather
  // than built at the default and then overwritten: assigning .mass afterwards
  // left massInCeres describing a different object from the one gravity saw.
  const asteroid = new Asteroid(pos, vel, object.mass / CERES_MASS_UNIT);
  asteroid.name = object.name || 'Transformed Asteroid';

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
    debugLog('Clearing energy chart due to object transformation');
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
    const mergingNote =
      SETTINGS.enable_star_merging === false
        ? `<p style="color:#f5a623;font-size:12px;margin-top:4px;">⚠ ${t('scenarioCard.notice.mergingDisabled')}</p>`
        : '';
    scenarioInfoDiv.innerHTML = `<h4>${scenarioTitle(current_scenario_name)}</h4><p>${scenarioSummary(current_scenario_name)}</p>${mergingNote}`;
    scenarioInfoDiv.classList.add('visible');
    setTimeout(() => scenarioInfoDiv.classList.remove('visible'), 6000);
  } else {
    scenarioInfoDiv.classList.remove('visible');
  }
};

// Enhanced scenario info box function
const show_enhanced_scenario_info = scenarioName => {
  if (!scenarioName || !SCENARIO_INFO[scenarioName]) {
    return;
  }

  // A lesson loads a scenario every time a step asks for one, and this card is
  // 720px wide and lands on top of the instrument panel. During an
  // investigation the step's own text is the introduction to the scenario, so
  // the card is redundant as well as in the way.
  if (document.body.classList.contains('investigation-open')) return;

  const infoBox = document.getElementById('scenarioInfoBox');
  const title = document.getElementById('scenarioInfoTitle');
  const summary = document.getElementById('scenarioInfoSummary');
  const features = document.getElementById('scenarioInfoFeatures');

  // The info card is optional chrome; a missing node must not abort
  // initialize_simulation and leave the app half-built.
  if (!infoBox || !title || !summary || !features) return;

  // Set the title and summary. The key is kept on the element because the card
  // outlives the call that wrote it: a language arriving late has to be able to
  // ask which scenario is on screen.
  infoBox.dataset.scenarioKey = scenarioName;
  title.textContent = scenarioTitle(scenarioName);
  summary.textContent = scenarioSummary(scenarioName);

  // Populate features with relevant notices
  features.innerHTML = '';
  if (SETTINGS.enable_star_merging === false) {
    const li = document.createElement('li');
    li.className = 'merging-disabled-notice';
    li.textContent = t('scenarioCard.notice.mergingDisabledLong');
    features.appendChild(li);
  }

  // Whether anything is currently covering the simulation. The card is shown
  // for eighteen seconds and then hides itself, so raising it under a
  // full-screen layer would burn the whole eighteen seconds where nobody can
  // read it: a first-time visitor would enter the sandbox to find the card that
  // names their scenario already gone. Both start-up layers are checked, and
  // the welcome screen through a body class rather than an import, because
  // welcome.js imports this module to load scenarios.
  const onboardingLayerUp = () => {
    const splash = document.getElementById('splash');
    const splashUp =
      splash &&
      !splash.classList.contains('hidden') &&
      splash.style.display !== 'none';
    return (
      Boolean(splashUp) || document.body.classList.contains('welcome-open')
    );
  };

  const raise = () => {
    infoBox.classList.add('showUI');
    setTimeout(() => infoBox.classList.remove('showUI'), 18000);
  };

  if (onboardingLayerUp()) {
    const waitForClearScreen = () => {
      if (onboardingLayerUp()) {
        setTimeout(waitForClearScreen, 100);
        return;
      }
      raise();
    };
    waitForClearScreen();
  } else {
    raise();
  }
};

// The sound control is an icon button in the readout's header rather than the
// panel-with-a-paragraph it used to be. The paragraph explained a feature that
// is off by default and stays off for almost everybody, and it was the first
// third of the one panel that shows live numbers. The explanation now lives in
// the button's tooltip, where an explanation of a control belongs.
const refreshSonificationToggle = () => {
  const toggle = document.getElementById('sonificationToggle');
  if (!toggle) {
    return;
  }
  const glyph = toggle.querySelector('.readout-icon-glyph') || toggle;

  const { muted, supported } = getSonificationState();
  if (!supported) {
    glyph.textContent = '🔇';
    toggle.disabled = true;
    toggle.dataset.state = 'disabled';
    toggle.title = t('readout.sonification.unavailable');
    toggle.setAttribute('aria-label', t('readout.sonification.unavailable'));
    toggle.setAttribute('aria-pressed', 'false');
    return;
  }

  toggle.disabled = false;
  glyph.textContent = muted ? '🔇' : '🔊';
  toggle.dataset.state = muted ? 'muted' : 'active';
  toggle.title = muted
    ? t('readout.sonification.off.hint')
    : t('readout.sonification.on.hint');
  toggle.setAttribute(
    'aria-label',
    muted ? t('readout.sonification.off') : t('readout.sonification.on')
  );
  toggle.setAttribute('aria-pressed', (!muted).toString());
};

const sonificationToggleBtn = document.getElementById('sonificationToggle');
if (sonificationToggleBtn) {
  refreshSonificationToggle();
  sonificationToggleBtn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    toggleSonification();
    refreshSonificationToggle();
  });
} else {
  console.warn('Sonification toggle button not found');
}

/**
 * Build the world, then hand it a fresh identity.
 *
 * World generation draws on Math.random in roughly 180 places, so on its own
 * it produces a different system every time - which is fine for a sandbox and
 * useless for a shared link. Running it inside withSeed() makes the whole
 * build a function of one number, so the same seed rebuilds the same universe
 * and a link only has to carry the seed.
 *
 * @param {Object} [options]
 * @param {string|number} [options.seed] - Reuse this seed instead of a new one
 * @param {boolean} [options.keepSeed] - Rebuild with the seed already in use
 * @returns {number} The seed the world was built from
 */

const initialize_simulation = (options = {}) => {
  if (options.seed !== undefined) {
    setWorldSeed(options.seed);
  } else if (!options.keepSeed) {
    // A plain rebuild - a new scenario, or Refresh - is meant to give
    // something new to look at, so it gets a new seed.
    setWorldSeed(randomSeed());
  }
  // applyPreset signs off by setting preset_scenario to the 'None' sentinel,
  // so a second build reads no scenario: it skips the preset, keeps the old
  // settings and records the scenario name as 'None'. Callers compensate by
  // reassigning the name first - the Refresh and Reset buttons each do it by
  // hand - which is a precondition easy to forget and silent when missed.
  // Restoring it here makes every rebuild idempotent instead.
  if (SETTINGS.preset_scenario === 'None' && current_scenario_name) {
    SETTINGS.preset_scenario = current_scenario_name;
  }

  const seed = getWorldSeed();
  withSeed(seed, () => build_simulation());
  // The object lists have just been repopulated; the physics caches hold the
  // previous set and must not be reused.
  bumpWorldGeneration();
  // The clock and the conservation baseline belong to the world that was just
  // torn down, not to this one. The baseline is taken after the caches are
  // bumped, so it is measured over the bodies that now exist rather than over
  // whatever the previous scenario left in the cached lists.
  resetSimulationTime();
  // The absorption ledger counts spin banked and momentum discarded since the
  // world was built, so it starts over with the world.
  resetAbsorptionAccounting();
  resetConservationBaseline();
  resetPotentialCache();
  worldTouched = false;
  // A preset sets its own speed, so the readout is stale until it is told.
  updateSpeedDisplay();
  // Kept so a shared link can rebuild under the settings that actually
  // produced this world, then apply anything changed since. Some scenarios
  // read settings while generating - Kepler's 2nd Law derives its launch
  // velocities from the gravitational constant - so applying a later value
  // during the rebuild would quietly hand over a different experiment.
  generationSettings = JSON.parse(JSON.stringify(SETTINGS));
  return seed;
};

// Settings as they stood when the current world was built.
let generationSettings = null;

// Set when the author changes the world by hand. A seeded link stops being a
// truthful description of the simulation at that moment, because re-running
// generation would not produce what is now on screen.
let worldTouched = false;

/** Mark the world as hand-edited, so sharing switches to full state. */
const markWorldTouched = () => {
  worldTouched = true;
};

// Settings from a shared link, waiting for the next build to apply them.
let pendingSettingsOverride = null;

// Set while a guided investigation is running; see showObjectInspector.
let inspectorSuppressed = false;

/**
 * Hide the object inspector without disabling selection.
 * @param {boolean} value - True to withhold the panel on click
 */
const setInspectorSuppressed = value => {
  inspectorSuppressed = !!value;
  // Deliberately not hideObjectInspector(): that also clears the orbit overlay
  // and the equal-areas wedges, which are exactly what a lesson wants left on
  // screen. Only the panel itself is put away.
  if (inspectorSuppressed) {
    const el = document.getElementById('objectInspector');
    if (el) {
      el.classList.remove('visible');
      el.style.display = 'none';
      el.style.pointerEvents = 'none';
    }
    state.inspector_open = false;
    if (state.inspectorUpdateInterval) {
      clearInterval(state.inspectorUpdateInterval);
      state.inspectorUpdateInterval = null;
    }
  } else {
    const el = document.getElementById('objectInspector');
    if (el) el.style.display = '';
  }
};

// Placing anything by hand puts the world beyond what its seed rebuilds, so
// from here on a link has to carry the bodies themselves.
window.addEventListener('gravitasObjectPlaced', markWorldTouched);

// Which law governs a galaxy's outskirts is chosen in the rotation-curve panel,
// which writes it into the physics module. SETTINGS is a separate object, and
// it is the one the share codec and the A/B bench read - so without this the
// choice was invisible to both: a link made with the halo switched on reopened
// with it off, and the bench compared two runs that differed and reported that
// nothing had changed. That was true of the halo before MOND existed.
//
// Done by event rather than by importing the panel, so the dependency runs one
// way: the panel already announces the change for the listeners that predate
// three modes.
window.addEventListener('gravitasGalaxyGravityChanged', event => {
  const mode = event?.detail?.mode;
  if (mode !== 'newtonian' && mode !== 'halo' && mode !== 'mond') return;
  SETTINGS.galaxy_gravity = mode;
  markWorldTouched();
});

// World construction lives in js/world/build.js. What stays here is the wiring:
// the settings object, the mutable bindings it reads and writes, and the four
// pieces of user interface it has to touch on the way through.
const build_simulation = () =>
  buildWorld({
    settings: SETTINGS,
    state,
    applyPreset: apply_preset,
    takePendingSettings: () => {
      const pending = pendingSettingsOverride;
      pendingSettingsOverride = null;
      return pending;
    },
    setScenarioName: name => {
      setCurrentScenarioName(name);
    },
    hideObjectInspector,
    showScenarioInfo: show_enhanced_scenario_info,
    updateObjectTypeButton,
    computeAreaSweep,
    isAreaSweepSuppressed,
    regenerateStarfield: generateStarfield,
  });

// Settings functions
/**
 * The label an option menu shows for one of its values.
 *
 * The scenario preset list is the exception: its values are scenario keys, and
 * those already have titles in the catalogue under their own ids, so it defers
 * to those rather than carrying a second copy. Everything else looks up
 * `settings.option.<key>.<value>` and falls back to the raw value, which is
 * always English and always readable.
 *
 * @param {string} key - The setting's key
 * @param {string} value - The stored option value
 * @returns {string} A label for a reader
 */
// The settings panel and the inspector both render text into the DOM rather
// than carrying data-i18n attributes, so the sweep in js/i18n/dom.js cannot
// reach them. They are rebuilt instead, from the same functions that built them
// in the first place: a language change is a repaint, never a rebuild of the
// world.
onLocaleChange(() => {
  // The add button's caption is written by updateObjectTypeButton rather than
  // carried on a data-i18n attribute, because it says different things armed
  // and idle. The DOM sweep therefore cannot reach it and it is repainted here.
  try {
    updateObjectTypeButton();
  } catch {
    /* the rail is optional chrome */
  }
  try {
    if (
      !document.getElementById('settingsPanel')?.classList.contains('hidden')
    ) {
      buildSettingsMenu();
    }
  } catch {
    /* the panel is optional chrome */
  }
  try {
    if (state.inspector_open && state.selectedObject) {
      showObjectInspector(
        state.selectedObject.object,
        state.selectedObject.type
      );
    }
  } catch {
    /* likewise */
  }
  // The scenario card is written once, when the world is built. On a Spanish
  // first load that happens before the Spanish catalogue has arrived - it is a
  // dynamic import - so the card is drawn in English and then never touched
  // again. Rewriting it here is what makes the very first card a reader sees
  // be in their own language.
  try {
    const card = document.getElementById('scenarioInfoBox');
    const title = document.getElementById('scenarioInfoTitle');
    const summary = document.getElementById('scenarioInfoSummary');
    const key = card?.dataset.scenarioKey;
    if (card && title && summary && key && SCENARIO_INFO[key]) {
      title.textContent = scenarioTitle(key);
      summary.textContent = scenarioSummary(key);
    }
  } catch {
    /* the card is optional chrome */
  }
});

const settingOptionLabel = (key, value) => {
  if (key === 'preset_scenario') {
    return value === 'None'
      ? t('settings.option.presetScenario.none')
      : scenarioTitle(value);
  }
  const camel = key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
  const slug = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const id = `settings.option.${camel}.${slug}`;
  return hasMessage(id) || EN[id] ? t(id) : value;
};

const setting_items = [
  {
    labelId: 'settings.label.presetScenario',
    key: 'preset_scenario',
    type: 'option',
    // Derived, never listed: this used to be a hand-written copy of all
    // forty-three scenario names, which is a second catalog that silently
    // drifts the first time someone adds a scenario and forgets this list.
    options: ['None', ...Object.keys(SCENARIO_INFO)],
  },
  { labelId: 'settings.section.simulation', type: 'separator' },
  {
    labelId: 'settings.label.gravitationalConstant',
    key: 'gravitational_constant',
    type: 'float',
    min: 0.1,
    max: 20.0,
    step: 0.1,
  },
  {
    labelId: 'settings.label.mutualGravity',
    key: 'mutual_gravity',
    type: 'bool',
  },
  {
    labelId: 'settings.label.simSpeed',
    key: 'sim_speed',
    type: 'float',
    min: 0.0,
    max: 5.0,
    step: 0.1,
  },
  {
    labelId: 'settings.label.simSize',
    key: 'sim_size',
    type: 'option',
    options: ['Small', 'Medium', 'Large', 'Huge'],
  },
  {
    labelId: 'settings.label.placement',
    key: 'placement',
    type: 'option',
    options: ['Circular', 'Multi-Ring', 'Random', 'Grid', 'Empty'],
  },
  {
    labelId: 'settings.label.integrator',
    key: 'integrator',
    type: 'option',
    options: INTEGRATORS,
  },
  {
    labelId: 'settings.label.showConservationDiagnostics',
    key: 'show_conservation_diagnostics',
    type: 'bool',
  },
  { labelId: 'settings.section.performance', type: 'separator' },
  {
    labelId: 'settings.label.useBarnesHut',
    key: 'use_barnes_hut',
    type: 'bool',
  },
  {
    labelId: 'settings.label.barnesHutTheta',
    key: 'barnes_hut_theta',
    type: 'float',
    min: 0.2,
    max: 1.2,
    step: 0.05,
  },
  {
    labelId: 'settings.label.adaptiveDetail',
    key: 'adaptive_detail',
    type: 'bool',
  },
  {
    labelId: 'settings.label.qualityTier',
    key: 'quality_tier',
    type: 'option',
    options: ['auto', 'full', 'low'],
  },
  { labelId: 'settings.section.visuals', type: 'separator' },
  {
    labelId: 'settings.label.trailColourMode',
    key: 'trail_colour_mode',
    type: 'option',
    options: ['type', 'speed'],
  },
  {
    labelId: 'settings.label.showObjectLensing',
    key: 'show_object_lensing',
    type: 'bool',
  },
  {
    labelId: 'settings.label.lensingQuality',
    key: 'lensing_quality',
    type: 'option',
    options: ['off', 'low', 'medium', 'high'],
  },
  {
    labelId: 'settings.label.diskDoppler',
    key: 'disk_doppler',
    type: 'bool',
  },
  { labelId: 'settings.section.black-holes', type: 'separator' },
  {
    labelId: 'settings.label.numBlackHoles',
    key: 'num_black_holes',
    type: 'int',
    min: 0,
    max: 10,
    step: 1,
  },
  {
    labelId: 'settings.label.bhMass',
    key: 'bh_mass',
    type: 'float',
    min: 0.1,
    max: 1000,
    step: 0.5,
  },
  {
    labelId: 'settings.label.useIndividualBhMasses',
    key: 'use_individual_bh_masses',
    type: 'bool',
  },
  {
    labelId: 'settings.label.bhBehavior',
    key: 'bh_behavior',
    type: 'option',
    options: ['Static', 'Orbiting'],
  },
  {
    labelId: 'settings.label.orbitDecayRate',
    key: 'orbit_decay_rate',
    type: 'float',
    min: 0.0,
    max: 0.1,
    step: 0.001,
    precision: 3,
  },
  { labelId: 'settings.section.compact-objects', type: 'separator' },
  {
    labelId: 'settings.label.numNeutronStars',
    key: 'num_neutron_stars',
    type: 'int',
    min: 0,
    max: 20,
    step: 1,
  },
  {
    labelId: 'settings.label.numWhiteDwarfs',
    key: 'num_white_dwarfs',
    type: 'int',
    min: 0,
    max: 30,
    step: 1,
  },
  {
    labelId: 'settings.label.numStars',
    key: 'num_stars',
    type: 'int',
    min: 0,
    max: 20,
    step: 1,
  },
  { labelId: 'settings.section.objects', type: 'separator' },
  {
    labelId: 'settings.label.numPlanets',
    key: 'num_planets',
    type: 'int',
    min: 0,
    max: 200,
    step: 1,
  },
  {
    labelId: 'settings.label.numGasGiants',
    key: 'num_gas_giants',
    type: 'int',
    min: 0,
    max: 50,
    step: 1,
  },
  {
    labelId: 'settings.label.enableAsteroids',
    key: 'enable_asteroids',
    type: 'bool',
  },
  {
    labelId: 'settings.label.numAsteroids',
    key: 'num_asteroids',
    type: 'int',
    min: 0,
    max: 500,
    step: 5,
  },
  {
    labelId: 'settings.label.numComets',
    key: 'num_comets',
    type: 'int',
    min: 0,
    max: 100,
    step: 1,
  },
  {
    labelId: 'settings.label.initVelocity',
    key: 'init_velocity',
    type: 'float',
    min: 0,
    max: 100,
    step: 1,
  },
  {
    labelId: 'settings.label.velocityStddev',
    key: 'velocity_stddev',
    type: 'float',
    min: 0,
    max: 50,
    step: 1,
  },
  {
    labelId: 'settings.label.inputObjectType',
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
  { labelId: 'settings.section.visuals', type: 'separator' },
  { labelId: 'settings.label.showTrails', key: 'show_trails', type: 'bool' },
  {
    labelId: 'settings.label.trailStyle',
    key: 'trail_style',
    type: 'option',
    options: ['Cloud', 'Simple', 'Glow'],
  },
  {
    labelId: 'settings.label.trailLength',
    key: 'trail_length',
    type: 'int',
    min: 5,
    max: 300,
    step: 5,
  },
  {
    labelId: 'settings.label.showVelocityVectors',
    key: 'show_velocity_vectors',
    type: 'bool',
  },
  {
    labelId: 'settings.label.showAccelerationVectors',
    key: 'show_acceleration_vectors',
    type: 'bool',
  },
  {
    labelId: 'settings.label.showPotentialWell',
    key: 'show_potential_well',
    type: 'bool',
  },
  {
    labelId: 'settings.label.showScaleBar',
    key: 'show_scale_bar',
    type: 'bool',
  },
  {
    labelId: 'settings.label.showElapsedTime',
    key: 'show_elapsed_time',
    type: 'bool',
  },
  { labelId: 'settings.label.showBhGlow', key: 'show_bh_glow', type: 'bool' },
  {
    labelId: 'settings.label.showAccretionDisk',
    key: 'show_accretion_disk',
    type: 'bool',
  },
  {
    labelId: 'settings.label.realisticDiskPhysics',
    key: 'realistic_disk_physics',
    type: 'bool',
  },
  { labelId: 'settings.label.showBhJets', key: 'show_bh_jets', type: 'bool' },
  {
    labelId: 'settings.label.starDensity',
    key: 'star_density',
    type: 'int',
    min: 0,
    max: 30000,
    step: 100,
  },
  {
    labelId: 'settings.label.showAmbientLighting',
    key: 'show_ambient_lighting',
    type: 'bool',
  },
  {
    labelId: 'settings.label.dynamicObjectProperties',
    key: 'dynamic_object_properties',
    type: 'bool',
  },
  {
    labelId: 'settings.label.planetBaseColor',
    key: 'planet_base_color',
    type: 'color',
  },
  {
    labelId: 'settings.label.starBaseColor',
    key: 'star_base_color',
    type: 'color',
  },
  { labelId: 'settings.section.ui-control', type: 'separator' },
  {
    labelId: 'settings.label.interactiveAdd',
    key: 'interactive_add',
    type: 'bool',
  },
  {
    labelId: 'settings.label.followMode',
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
  {
    labelId: 'settings.label.showDynamicOverlays',
    key: 'show_dynamic_overlays',
    type: 'bool',
  },
  {
    labelId: 'settings.label.recordSimulation',
    key: 'record_simulation',
    type: 'bool',
  },
  {
    labelId: 'settings.label.showGravitationalWaves',
    key: 'show_gravitational_waves',
    type: 'bool',
  },
  { labelId: 'settings.section.educational', type: 'separator' },
  {
    labelId: 'settings.label.habitableZoneOptimism',
    key: 'habitable_zone_optimism',
    type: 'float',
    min: 0.5,
    max: 2.0,
    step: 0.1,
  },
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
    closeButton.title = t('tip.dismiss');
    closeButton.setAttribute('aria-label', 'Dismiss this tip');
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

    closeButton.addEventListener('click', e => {
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
    closeButton.title = t('tip.dismiss');
    closeButton.setAttribute('aria-label', 'Dismiss this tip');
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

    closeButton.addEventListener('click', e => {
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
      options,
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
    if (
      this.activeTooltip &&
      !this.activeTooltip.element.contains(event.target) &&
      !this.tooltipElement.contains(event.target)
    ) {
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
      this.positionTooltip(
        this.activeTooltip.element,
        this.activeTooltip.options
      );
    }
  }

  handleScroll() {
    if (this.activeTooltip) {
      this.positionTooltip(
        this.activeTooltip.element,
        this.activeTooltip.options
      );
    }
  }
}

// Create global tooltip manager instance
const tooltipManager = new TooltipManager();

// Function to get tooltip text for settings
const getSettingTooltip = (key, label) => {
  const tooltips = {
    // Simulation settings
    gravitational_constant:
      'Determines the strength of gravity in the simulation. Higher values exaggerate gravitational effects for visualization.',
    sim_speed:
      'Controls how fast the simulation runs. Higher values make time pass faster.',
    mutual_gravity:
      'When enabled, all objects attract each other. When disabled, only black holes create gravity.',
    enable_star_merging:
      'When enabled, stars and other objects can merge when they get too close to each other.',

    // Object counts
    num_black_holes:
      'Number of black holes in the simulation. Each black hole creates a strong gravitational field.',
    bh_mass:
      'Mass of black holes in solar masses (M☉). Higher mass creates stronger gravity.',
    num_stars:
      'Number of stars in the simulation. Stars are lighter than black holes but still create gravity.',
    num_planets:
      'Number of planets in the simulation. Planets are small objects that orbit around larger bodies.',
    num_gas_giants:
      'Number of gas giant planets. These are larger than regular planets.',
    num_asteroids:
      'Number of asteroids in the simulation. These are small rocky objects.',
    num_comets:
      'Number of comets. These objects have highly elliptical orbits.',
    num_neutron_stars:
      'Number of neutron stars. These are dense stellar remnants.',
    num_white_dwarfs:
      'Number of white dwarfs. These are small, dense stellar remnants.',

    // Behavior settings
    bh_behavior:
      'How black holes behave: Static (stationary), Orbiting (move in orbits), or Rogue (random movement).',
    use_individual_bh_masses:
      'Toggle to assign unique masses to each black hole instead of a shared mass.',

    // Visual settings
    show_trails:
      'When enabled, objects leave trails showing their recent path.',
    trail_length: 'How long object trails persist on screen before fading.',
    trail_style: 'Style of the trails: Simple lines or glowing effects.',
    show_accretion_disk:
      'When enabled, black holes display accretion disk effects.',
    show_bh_glow: 'When enabled, black holes have a glowing effect.',
    star_density: 'Number of background stars in the starfield.',

    // Initial conditions
    placement:
      'How objects are initially positioned: Random, Circular, or Empty.',
    init_velocity: 'Initial velocity given to objects when they are created.',
    velocity_stddev:
      'Standard deviation of initial velocities, creating variation.',
    orbit_decay_rate:
      'How quickly orbits decay due to gravitational radiation.',

    // Scenario settings
    preset_scenario:
      'Choose from predefined scenarios with specific object configurations.',
    sim_size: 'Overall scale of the simulation: Small, Medium, or Large.',

    // Additional settings
    softening_length:
      'Reduces numerical instabilities by softening gravity at very small distances.',
    time_step:
      'Controls simulation speed and precision. Smaller steps = more accuracy but slower performance.',

    // Educational
    habitable_zone_optimism:
      'Which published habitable-zone definition the ring shows. Below 1.3 draws the conservative zone, bounded by the runaway and maximum greenhouse limits. 1.3 and above draws the optimistic zone, bounded by the empirical recent-Venus and early-Mars limits. The edges also depend on the star, not just this setting.',
  };

  return (
    tooltips[key] ||
    t('settings.tooltip.generic', { label: label.toLowerCase() })
  );
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
    box.innerHTML = `<h4>${scenarioTitle(presetName)}</h4>${scenarioSummary(presetName)}`;
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
          items: currentSectionItems,
        });
      }
      // Start new section
      currentSection = t(item.labelId);
      currentSectionItems = [];
    } else {
      currentSectionItems.push(item);
    }
  });

  // Add the last section
  if (currentSection && currentSectionItems.length > 0) {
    sections.push({
      title: currentSection,
      items: currentSectionItems,
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
    // The two-column label/control split and the gap are set in CSS rather than
    // here, so a narrow screen can stack them. Inline styles cannot be beaten by
    // a media query, and on a 375px phone a fixed 1fr 1fr grid put the sliders
    // and the value readouts off the right edge of the panel - in English, and
    // further off in Spanish, where the labels are about a fifth longer.
    sectionGrid.style.alignItems = 'center';

    // Add items to this section
    section.items.forEach(item => {
      // Create label container with info icon
      const labelContainer = document.createElement('div');
      labelContainer.className = 'setting-label-container';

      const label = document.createElement('div');
      label.className = 'setting-label';
      label.textContent = t(item.labelId);

      // Create info icon
      const infoIcon = document.createElement('button');
      infoIcon.className = 'setting-info-icon';
      infoIcon.textContent = 'ⓘ';
      infoIcon.setAttribute(
        'aria-label',
        t('settings.info.about', { label: t(item.labelId) })
      );

      // Add click handler for tooltip using the new tooltip system
      infoIcon.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();

        const tooltipText = getSettingTooltip(item.key, t(item.labelId));
        tooltipManager.show(tooltipText, infoIcon, { position: 'bottom' });
      });

      // Add label and icon to container
      labelContainer.appendChild(label);
      labelContainer.appendChild(infoIcon);

      const controlContainer = document.createElement('div');
      controlContainer.className = 'setting-control';
      const value = localSettings[item.key];

      // A row is two siblings in the grid rather than one wrapper - the label
      // and the control are separate children so the grid can align every
      // label against every control. The filter therefore has to hide them in
      // pairs, so both carry the same key and the same haystack. Searching the
      // setting's own key as well as its label means `bh_mass` finds the black
      // hole mass whichever language the interface is in.
      const haystack =
        `${t(item.labelId)} ${item.key} ${(item.options || []).join(' ')}`
          .toLowerCase()
          .trim();
      labelContainer.dataset.settingKey = item.key;
      controlContainer.dataset.settingKey = item.key;
      labelContainer.dataset.settingSearch = haystack;
      controlContainer.dataset.settingSearch = haystack;

      if (item.type === 'int' || item.type === 'float') {
        // The slider, its readout, and a label that is read but not seen.
        //
        // That label used to be visible, carrying the same words as the row
        // label a few pixels to its left. The comment justifying it said the
        // duplicate was invisible in a two-column layout because the two sat
        // side by side and read as one heading. They did not: the row is
        // label-then-control, so the words appeared twice, and being the widest
        // thing in the control the copy is what pushed the slider's value
        // readout off the right edge of the panel. It stays in the markup,
        // tied to the input by `for`, because a range input needs a label -
        // it is just no longer drawn.
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'setting-slider';

        const sliderLabel = document.createElement('label');
        sliderLabel.textContent = t(item.labelId);
        sliderLabel.className = 'visually-hidden';
        sliderLabel.htmlFor = `${item.key}-slider`;

        const sliderRow = document.createElement('div');
        sliderRow.className = 'setting-slider-row';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = `${item.key}-slider`;
        slider.min = item.min;
        // A scenario may set a value above the range the slider was designed
        // for, and three of them do: the resonance scenarios run between 150
        // and 7,500 times the default speed, because a single libration of
        // Pluto's resonant angle takes twenty thousand years. With a fixed
        // maximum of 5 the slider would show as pinned, and the first touch
        // would drop the scenario to a speed at which nothing it is trying to
        // show can be seen - with no way back except reloading. Widening the
        // track to whatever is actually in force costs the ordinary case
        // nothing and keeps the control honest.
        slider.max = Math.max(Number(item.max), Number(value) || 0);
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
        sliderRow.append(slider, valueDisplay);
        sliderContainer.append(sliderLabel, sliderRow);
        controlContainer.append(sliderContainer);
      } else if (item.type === 'bool') {
        const button = document.createElement('button');
        button.className = 'toggle-button';
        button.textContent = value
          ? t('settings.toggle.on')
          : t('settings.toggle.off');
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
          // The value stored is always the English token - it is the key the
          // physics engine, the scenario presets and every saved share link
          // use - and only the label a reader sees is translated. A locale that
          // changed the stored value would produce links that only open in that
          // language.
          option.value = opt;
          option.textContent = settingOptionLabel(item.key, opt);
          if (opt === value) option.selected = true;
          select.appendChild(option);
        });
        select.onchange = e => {
          localSettings[item.key] = e.target.value;
          if (item.key === 'preset_scenario') {
            updatePresetInfo(e.target.value);
            setCurrentScenarioName(e.target.value);
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

      // Every control in this panel gets the setting's own name.
      //
      // The visible label is a <div class="setting-label"> sitting in a sibling
      // cell of the grid, which a sighted reader pairs with the control by
      // position and a screen reader cannot pair with it at all. The two
      // sliders build their own <label for> inside their container and were
      // fine; the selects, the on/off buttons and the two colour pickers were
      // not. The colour pickers had no accessible name of any kind - a reader
      // heard "colour picker" twice with nothing to say which was the star and
      // which the planet.
      //
      // Applied here, after the branch, so it covers every control type at once
      // and a type added later inherits it.
      const control = controlContainer.querySelector(
        'input, select, textarea, button'
      );
      if (
        control &&
        !control.getAttribute('aria-label') &&
        !control.getAttribute('aria-labelledby')
      ) {
        control.setAttribute('aria-label', t(item.labelId));
      }
      // A toggle whose name is now the setting reports its state through
      // aria-pressed instead of through the word inside it.
      if (item.type === 'bool' && control) {
        control.setAttribute('aria-pressed', String(Boolean(value)));
        const previous = control.onclick;
        control.onclick = event => {
          previous?.call(control, event);
          control.setAttribute(
            'aria-pressed',
            String(control.getAttribute('data-state') === 'on')
          );
        };
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
  wireSettingsFilter();
};

/**
 * Filter the settings panel down to the rows whose name matches a query.
 *
 * Sixty-three settings across nine collapsible sections is more than anyone
 * scans: finding `softening` meant opening sections until it appeared. Typing
 * narrows the panel to the matching rows, opens the sections holding them and
 * folds away the ones left empty, so the answer to "where is that setting" is
 * the same gesture every time.
 *
 * Rebuilt with the panel, so it re-reads the DOM each time rather than holding
 * references to elements that no longer exist. The query survives a rebuild -
 * a language change repaints the panel and should not also clear the box.
 */
const wireSettingsFilter = () => {
  const input = document.getElementById('settingsFilter');
  const empty = document.getElementById('settingsFilterEmpty');
  if (!input) return;

  const apply = () => {
    const query = input.value.trim().toLowerCase();
    let shown = 0;

    document.querySelectorAll('.settings-section').forEach(section => {
      let matchesHere = 0;
      section.querySelectorAll('[data-setting-search]').forEach(el => {
        const hit = !query || el.dataset.settingSearch.includes(query);
        el.hidden = !hit;
        // Both halves of a row carry the key, so counting one of them counts
        // the row.
        if (hit && el.classList.contains('setting-control')) matchesHere++;
      });
      section.hidden = Boolean(query) && matchesHere === 0;
      // A section folded shut would hide its own matches, so searching opens
      // the ones that have something to show. Clearing the box leaves them as
      // the reader left them rather than snapping everything closed again.
      if (query && matchesHere > 0) section.classList.remove('collapsed');
      shown += matchesHere;
    });

    if (empty) empty.hidden = !query || shown > 0;
  };

  input.oninput = apply;
  // Escape clears the filter before the panel's own Escape closes the panel,
  // which is what a reader who has typed into a search box expects the key to
  // do first.
  input.onkeydown = event => {
    if (event.key === 'Escape' && input.value) {
      event.stopPropagation();
      input.value = '';
      apply();
    }
  };
  apply();
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
    valueDisplay.innerHTML = solarHTML(Number(slider.value).toFixed(1));

    slider.oninput = e => {
      const index = parseInt(e.target.dataset.index, 10);
      const val = parseFloat(e.target.value);
      localSettings.bh_masses[index] = val;
      valueDisplay.innerHTML = solarHTML(val.toFixed(1));
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

/** Every body currently in the simulation, in a stable order. */
const allBodies = () => [
  ...bh_list,
  ...planets,
  ...stars,
  ...gas_giants,
  ...asteroids,
  ...comets,
  ...neutron_stars,
  ...white_dwarfs,
  ...debris,
];

/** Empty every object list, pool and derived cache. */
const clearWorld = () => {
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
  particlePool.clear();
  // Restored bodies reuse their saved ids, so any surviving history from the
  // previous run would be silently attributed to them.
  clearAllEnergyHistory();
  resetPhysicsObjectCounter();
  resetFrame();
  resetTrailTick();
};

/**
 * Rebuild the object lists from an array of saved states.
 *
 * Shared by the localStorage load and the shared-link load: both need exactly
 * this, and when it existed only inside load_simulation_state the two would
 * have drifted the first time a new body type was added.
 *
 * @param {Array<Object>} objectStates - Results of get_state(), in any order
 * @returns {number} How many bodies were restored
 */
const rebuildWorldFromStates = objectStates => {
  clearWorld();
  let maxId = 0;
  let restored = 0;

  for (const obj_state of objectStates || []) {
    if (!obj_state || typeof obj_state !== 'object') continue;
    const { type, pos, vel, mass } = obj_state;
    // A link can be edited by hand, so nothing here may assume well-formed
    // input; a body without a position would otherwise throw on first draw.
    if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) continue;
    const v = vel && Number.isFinite(vel.x) ? vel : { x: 0, y: 0 };

    let new_obj = null;
    if (type === 'Planet') new_obj = new Planet(pos, v);
    else if (type === 'GasGiant') new_obj = new GasGiant(pos, v);
    else if (type === 'Asteroid') new_obj = new Asteroid(pos, v);
    else if (type === 'Comet') new_obj = new Comet(pos, v);
    else if (type === 'StarObject') new_obj = new StarObject(pos, v);
    else if (type === 'NeutronStar')
      new_obj = new NeutronStar(pos, v, null, null);
    else if (type === 'WhiteDwarf') new_obj = new WhiteDwarf(pos, v);
    else if (type === 'Debris') new_obj = new Debris(pos, v);
    else if (type === 'BlackHole') new_obj = new BlackHole(pos, mass, v, true);
    if (!new_obj) continue;

    new_obj.set_state(obj_state);
    if (new_obj instanceof Planet) planets.push(new_obj);
    else if (new_obj instanceof GasGiant) gas_giants.push(new_obj);
    else if (new_obj instanceof Comet) comets.push(new_obj);
    else if (new_obj instanceof Asteroid) asteroids.push(new_obj);
    else if (new_obj instanceof StarObject) stars.push(new_obj);
    else if (new_obj instanceof NeutronStar) neutron_stars.push(new_obj);
    else if (new_obj instanceof WhiteDwarf) white_dwarfs.push(new_obj);
    else if (new_obj instanceof Debris) debris.push(new_obj);
    else if (new_obj instanceof BlackHole) bh_list.push(new_obj);
    maxId = Math.max(maxId, new_obj.id ?? 0);
    restored++;
  }

  setPhysicsObjectCounter(maxId + 1);
  bumpWorldGeneration();
  return restored;
};

/**
 * Save the current simulation state to localStorage
 * Includes all settings, object states, and view parameters
 */
const save_simulation_state = () => {
  try {
    const savedState = {
      settings: SETTINGS,
      view: { zoom: state.zoom, pan: state.pan },
      objects: allBodies().map(o => o.get_state()),
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
    setSettings(loadedState.settings || { ...DEFAULT_SETTINGS });
    const view = loadedState.view || { zoom: 1.5, pan: { x: 0, y: 0 } };
    state.zoom = view.zoom;
    state.pan = view.pan;
    updatePhysicsSettings(SETTINGS);
    rebuildWorldFromStates(loadedState.objects);
    // A restored save is a hand-made world by definition: no seed regenerates
    // it, so sharing it has to carry the bodies themselves.
    markWorldTouched();
    window.dispatchEvent(new CustomEvent('gravitasSimulationReset'));
    alert('Simulation state loaded!');
    state.paused = false;
    updateSpeedDisplay();
  } catch (e) {
    console.error('Error loading state:', e);
    alert('Failed to load state.');
  }
};

// --- Shared links -------------------------------------------------------------

/**
 * Describe the current simulation as a payload fit for a URL.
 *
 * Takes the elapsed simulation clock as an argument rather than importing
 * timeline.js: timeline.js already imports this module, and the cycle is
 * avoidable by letting the caller - which imports both - supply the number.
 *
 * @param {Object} [opts]
 * @param {'seeded'|'full'|'auto'} [opts.kind] - Payload kind; 'auto' decides
 * @param {boolean} [opts.includeCamera] - Carry zoom and pan
 * @param {number} [opts.elapsed] - Simulated seconds run since the world built
 * @returns {Object} Payload for encodePayload()
 */
const captureShareState = ({
  kind = 'auto',
  includeCamera = true,
  elapsed = 0,
  // The A/B bench asks for these. A share link does not need them and pays for
  // every character, so they are opt-in rather than always carried.
  forExperiment = false,
  experiment = null,
} = {}) => {
  const resolved =
    kind === 'auto' ? chooseKind({ touched: worldTouched, elapsed }) : kind;

  const extras = forExperiment
    ? withExtras(
        {},
        {
          clock: getSimulationTime(),
          frame: frameState(),
          observer: {
            positionAngle: getPositionAngle(),
            inclination: getInclination(),
          },
          tools: activeToolIds(),
        }
      ).x
    : null;

  return buildPayload({
    // current_scenario_name, not SETTINGS.preset_scenario: applyPreset leaves
    // the latter set to the 'None' sentinel, so reading it would stamp every
    // link with a scenario that loads nothing.
    scenario: current_scenario_name,
    seed: getWorldSeed(),
    settings: SETTINGS,
    generationSettings,
    DEFAULT_SETTINGS,
    camera: includeCamera ? { zoom: state.zoom, pan: state.pan } : null,
    bodies:
      resolved === 'full'
        ? allBodies()
            .filter(o => o && o.alive !== false)
            .map(o => packBody(o.get_state(), { withId: forExperiment }))
        : null,
    paused: state.paused,
    extras,
    experiment,
  });
};

/**
 * Which measurement tools are out, for an experiment's initial state.
 *
 * Only the fact that a tool is active, not where its handles are: restoring a
 * ruler to the pixel is not what makes two runs comparable, and the handles are
 * stored in world coordinates that a rebuilt world may not have.
 *
 * @returns {Array<string>} Active tool ids
 */
const activeToolIds = () =>
  ['ruler', 'protractor', 'stopwatch'].filter(id => {
    try {
      return isToolActive(id);
    } catch {
      return false;
    }
  });

/**
 * Rebuild the simulation described by a decoded payload.
 *
 * @param {Object} payload - From decodePayload()
 * @returns {{scenario:string, kind:string, bodies:number}} What was restored
 */
const applyShareState = payload => {
  const scenario = payload.s;
  SETTINGS.preset_scenario = scenario;

  // Held for build_simulation() to apply. Settings cannot simply be assigned
  // here: apply_preset() runs first inside the build and resets everything to
  // the scenario's own defaults, which would discard them.
  pendingSettingsOverride = payload.d ? { ...payload.d } : null;

  const seed = payloadSeed(payload);

  if (Array.isArray(payload.b) && payload.b.length) {
    // A full payload describes a world no seed reproduces. Build the scenario
    // first so settings, starfield and preset geometry are right, then replace
    // the bodies with the ones the link actually carries.
    initialize_simulation({ seed });
    rebuildWorldFromStates(payload.b);
    updatePhysicsSettings(SETTINGS);
    markWorldTouched();
  } else {
    initialize_simulation({ seed });
  }

  // Settings the author changed after the world was built are applied now, in
  // the same order they happened, so live-applied values like gravity land on
  // an already-generated system rather than shaping the generation itself.
  if (payload.a) {
    Object.assign(SETTINGS, payload.a);
    updatePhysicsSettings(SETTINGS);
  }

  if (Array.isArray(payload.c) && payload.c.length === 3) {
    const [zoom, panX, panY] = payload.c;
    if (Number.isFinite(zoom) && zoom > 0) state.zoom = zoom;
    if (Number.isFinite(panX) && Number.isFinite(panY)) {
      state.pan = { x: panX, y: panY };
    }
  }

  state.paused = payload.p === 1;
  setCurrentScenarioName(scenario);

  // Everything an experiment needs restored that a link never carried. A
  // payload without an `x` block yields the defaults - clock at zero, world
  // frame, edge-on observer - which is exactly what an ordinary share link
  // means, so this path is safe for every link ever made.
  const extras = readExtras(payload);
  setSimulationTime(extras.clock);
  try {
    if (extras.frame.mode && extras.frame.mode !== 'world') {
      setFrame(extras.frame.mode, extras.frame.objectId);
    } else {
      resetFrame();
    }
  } catch (err) {
    // A frame naming a body that this world does not contain is a bad link,
    // not a reason to fail the whole restore.
    console.warn('Could not restore the reference frame:', err);
  }
  setPositionAngle(extras.observer.positionAngle);
  setInclination(extras.observer.inclination);

  updateSpeedDisplay();
  updateObjectTypeButton();

  return {
    scenario,
    kind: payload.b ? 'full' : 'seeded',
    bodies: allBodies().length,
    extras,
  };
};

// Utility functions
/**
 * Update the speed display in the UI to show current simulation speed
 */
const updateSpeedDisplay = () => {
  const speedDisplay = document.getElementById('speedDisplay');
  if (speedDisplay) {
    // One decimal reads any speed below 0.05 as "0.0x", which looks like the
    // simulation is stopped. A compact scenario can legitimately run at 0.01.
    const v = SETTINGS.sim_speed;
    const shown = v === 0 ? '0' : v < 0.1 ? v.toFixed(2) : v.toFixed(1);
    speedDisplay.textContent = `${shown}\u00d7`;
  }
};

/**
 * Adjust simulation speed with custom stepping:
 * - From <=0.5x downward: 0.5 -> 0.3 -> 0.1 -> 0.0 (pause)
 * - From <=0.5x upward: 0.0 -> 0.1 -> 0.3 -> 0.5
 * - Above 0.5x: steps of 0.5x up to 5.0x
 */
const adjustSimSpeed = (current, direction) => {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const epsilon = 1e-9;
  const stepsBelow = [0.0, 0.1, 0.3, 0.5]; // ascending

  // Normalize very small values to exact 0
  if (Math.abs(current) < epsilon) current = 0.0;

  // Handle <= 0.5x region with special stepping
  if (current < 0.5 - epsilon) {
    if (direction > 0) {
      for (let i = 0; i < stepsBelow.length; i++) {
        if (stepsBelow[i] > current + epsilon) return stepsBelow[i];
      }
      return 0.5;
    }
    if (direction < 0) {
      for (let i = stepsBelow.length - 1; i >= 0; i--) {
        if (stepsBelow[i] < current - epsilon) return stepsBelow[i];
      }
      return 0.0;
    }
    return current;
  }
  // If exactly ~0.5x, go up to 1.0 or down to 0.3
  if (Math.abs(current - 0.5) <= epsilon) {
    if (direction > 0) return 1.0;
    if (direction < 0) return 0.3;
    return current;
  }

  // Above 0.5x: increments of 0.5
  const next = current + (direction > 0 ? 0.5 : -0.5);
  return clamp(Number(next.toFixed(1)), 0.0, 5.0);
};

/**
 * What a captured frame should call itself.
 *
 * The scenario's translated title, or 'Sandbox' when the user has built the
 * scene by hand and there is no scenario to name. Either way the exported
 * image says which run it is a picture of, which - with the scale bar and the
 * clock beside it - is what makes it citable rather than decorative.
 *
 * @returns {string} The caption to burn into the frame
 */
const captureCaption = () => {
  const named = current_scenario_name && current_scenario_name !== 'None';
  return named
    ? scenarioTitle(current_scenario_name) || current_scenario_name
    : t('capture.caption.sandbox');
};

/**
 * Take a screenshot of the current simulation
 * Combines the starfield and simulation canvases into a single image
 */
const takeScreenshot = () => {
  // Ask for the provenance line - the simulated clock, the stopwatch, the
  // vector key - to be painted on the canvas, then let one frame be drawn
  // before reading the pixels back. Live, those readings are in the readout
  // panel and painting them over the simulation as well would say the same
  // thing twice; a saved image has no readout panel, so it needs them.
  setCaptureMode(true, { caption: captureCaption() });
  const capture = () => {
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
    } finally {
      // A recording holds capture mode on for its whole length. A still taken
      // during one must not switch the burnt-in caption and clock off in the
      // middle of the clip.
      if (isRecording()) setCaptureMode(true, { caption: captureCaption() });
      else setCaptureMode(false);
    }
  };
  // Two frames: the first is the one that repaints with the flag set, the
  // second is where it is certainly on the canvas.
  requestAnimationFrame(() => requestAnimationFrame(capture));
};

// Object type cycling functionality
const objectTypes = [
  { type: 'Star', emoji: '⭐', label: 'objectType.stars' },
  { type: 'Planet', emoji: '🌍', label: 'objectType.rockyPlanets' },
  { type: 'GasGiant', emoji: '🪐', label: 'objectType.gasGiants' },
  // Asteroids and comets both used the comet emoji, which in a list of eight
  // is two rows that look the same.
  { type: 'Asteroid', emoji: '🪨', label: 'objectType.asteroids' },
  { type: 'Comet', emoji: '☄️', label: 'objectType.comets' },
  { type: 'WhiteDwarf', emoji: '💎', label: 'objectType.whiteDwarfs' },
  { type: 'NeutronStar', emoji: '⚡', label: 'objectType.neutronStars' },
  { type: 'BlackHole', emoji: '⚫', label: 'objectType.blackHoles' },
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
  const armed = document.body.classList.contains('is-adding');
  // Armed, the caption says what the next click will do and how to stop; idle,
  // it says what the button opens. The emoji stays either way so the control
  // keeps its shape in the rail.
  // Idle, the button says what it opens rather than which type is loaded: it
  // is a picker now, and naming one of eight types on a control whose job is to
  // let you choose among them read as though that type were already committed.
  // The emoji still tracks the selection, so the current choice is visible
  // without the caption claiming to be it.
  btn.innerHTML = `${currentType.emoji} ${
    armed ? t('rail.objectType.placing') : t('rail.objectType.choose')
  }`;
  btn.classList.toggle('is-armed', armed);
  btn.setAttribute('aria-pressed', String(armed));
  btn.title = armed
    ? `${t(currentType.label)}: click the canvas to place one, or press Escape to stop.`
    : 'Choose what to add, then click the canvas to place it';
  SETTINGS.input_object_type = currentType.type;
};

// --- Pointer input, and the one place CSS pixels become canvas pixels ---------
//
// The simulation canvas is laid out at 100% of the window by CSS and its
// backing store is set in js/render.js. Those were the same number until the
// low quality tier started rendering below native resolution and letting the
// compositor upscale, and from that moment a pointer event - which arrives in
// CSS pixels - stopped being a canvas coordinate.
//
// Everything downstream of here works in canvas pixels: screen_to_world reads
// canvas.width, state.mouse is drawn straight into the context, and state.pan
// is added to a world-to-screen result. So the conversion happens once, at the
// boundary, and nothing inside has to know the tier exists.
//
// getBoundingClientRect rather than innerWidth: the canvas is the thing being
// scaled, and asking it is both correct and robust to a future layout that does
// not have it filling the window.
/**
 * A pointer event in canvas coordinates.
 *
 * @param {{clientX: number, clientY: number}} e - A mouse or touch point
 * @returns {{x: number, y: number}} The same point in canvas pixels
 */
const canvasPoint = e => {
  const rect = canvas.getBoundingClientRect();
  const sx = rect.width > 0 ? canvas.width / rect.width : 1;
  const sy = rect.height > 0 ? canvas.height / rect.height : 1;
  return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
};

/**
 * A pointer *movement* in canvas pixels.
 *
 * movementX/Y are CSS pixels, and state.pan is in canvas pixels, so a drag at
 * the low tier would move the view more slowly than the cursor without this.
 *
 * @param {{movementX: number, movementY: number}} e - A mouse move
 * @returns {{x: number, y: number}} The movement in canvas pixels
 */
const canvasMovement = e => {
  const rect = canvas.getBoundingClientRect();
  const sx = rect.width > 0 ? canvas.width / rect.width : 1;
  const sy = rect.height > 0 ? canvas.height / rect.height : 1;
  return { x: e.movementX * sx, y: e.movementY * sy };
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
  if (
    e.clientX >= uiRect.left - bufferZone &&
    e.clientX <= uiRect.right + bufferZone &&
    e.clientY >= uiRect.top - bufferZone &&
    e.clientY <= uiRect.bottom + bufferZone
  ) {
    return;
  }

  // The measurement tools get first refusal on the press. A ruler end sitting
  // over a planet has to be grabbable, and without this the click would select
  // the planet underneath it instead - or, on empty space, start dragging a new
  // body into existence out of the handle the user meant to move.
  const pointer = canvasPoint(e);
  if (toolsPointerDown(pointer)) {
    state.isHolding = false;
    state.adding_mass = false;
    state.isDragging = false;
    return;
  }

  const worldPos = screen_to_world(pointer);
  const clickedObject = findObjectAtPosition(worldPos);

  if (clickedObject) {
    // Clicking an existing object should ONLY open inspector, never start add/hold
    state.isHolding = false;
    state.adding_mass = false;
    state.isDragging = false;
    showObjectInspector(clickedObject.object, clickedObject.type);
    return;
  }

  // Only close inspector if we clicked on empty space and inspector is open
  if (state.inspector_open && !clickedObject) {
    hideObjectInspector();
    // Do not add on this click when closing inspector
    return;
  }

  // Set before the guard below, because dragging to pan has to work whether or
  // not this press could place anything.
  state.mouse.down = true;

  // Armed placement only, and that governs the preview as well as the object.
  //
  // Without this a stray click on empty canvas - the common one being a near
  // miss on a small body whose inspector was wanted - created a mass that
  // perturbs everything already there.
  //
  // The hold state below is part of the same gate. It used to be set on every
  // press on empty sky, which meant getOrbitPreview() had a start and a current
  // point and the renderer drew its dashed launch line: a click on empty space
  // left a pair of dashes hanging in the field with no object coming and
  // nothing to explain them. A preview is a promise about what releasing the
  // mouse will do, so it must not appear when the answer is "nothing".
  if (!placementArmed()) return;

  // Begin hold for orbit preview on empty space only
  state.isHolding = true;
  state.holdStart = { ...worldPos };
  state.holdCurrent = { ...worldPos };
  // Reset sticky orbit on new hold
  state.stickyOrbit.active = false;
  state.stickyOrbit.centralId = null;
  state.stickyOrbit.snappedVel = null;

  // Validate world coordinates before proceeding
  if (
    isNaN(worldPos.x) ||
    isNaN(worldPos.y) ||
    !isFinite(worldPos.x) ||
    !isFinite(worldPos.y)
  ) {
    console.warn('Invalid world coordinates:', worldPos);
    return;
  }

  state.adding_mass = true;
  state.add_start_screen = { ...pointer };
  state.add_start_world = worldPos;
  // Start drag preview
  state.isDragging = true;
  state.dragStart = { ...worldPos };
  state.dragCurrent = { ...worldPos };
});

window.addEventListener('mousemove', e => {
  const moved = canvasPoint(e);
  state.mouse.x = moved.x;
  state.mouse.y = moved.y;
  if (toolsPointerMove(moved)) return;
  if (state.mouse.down && !state.adding_mass) {
    const delta = canvasMovement(e);
    state.pan.x += delta.x;
    state.pan.y += delta.y;
  }
  if (state.adding_mass) {
    updateOrbitHelper(e.shiftKey);
    // Update drag preview current
    const worldPos = screen_to_world(moved);
    state.dragCurrent = worldPos;
    if (state.isHolding) state.holdCurrent = { ...worldPos };
  }
});

window.addEventListener('mouseup', e => {
  if (e.button !== 0) return;
  if (toolsPointerUp()) {
    state.mouse.down = false;
    return;
  }
  state.mouse.down = false;
  if (state.adding_mass) {
    state.adding_mass = false;
    state.isDragging = false;
    const add_end_world = screen_to_world(canvasPoint(e));

    // Validate both start and end world coordinates
    if (
      isNaN(add_end_world.x) ||
      isNaN(add_end_world.y) ||
      !isFinite(add_end_world.x) ||
      !isFinite(add_end_world.y) ||
      isNaN(state.add_start_world.x) ||
      isNaN(state.add_start_world.y) ||
      !isFinite(state.add_start_world.x) ||
      !isFinite(state.add_start_world.y)
    ) {
      console.warn('Invalid world coordinates during object placement:', {
        start: state.add_start_world,
        end: add_end_world,
      });
      return;
    }

    let vel = {
      x: (add_end_world.x - state.add_start_world.x) * 1.5,
      y: (add_end_world.y - state.add_start_world.y) * 1.5,
    };
    // If sticky orbit was active at release, use the snapped velocity for stable orbit
    if (state.stickyOrbit.active && state.stickyOrbit.snappedVel) {
      vel = { ...state.stickyOrbit.snappedVel };
    }
    // Snap to circular around dominant body if Shift key is held
    if (state.orbit_helper.enabled && e.shiftKey) {
      const prev = state.orbit_helper.preview;
      if (prev && prev.attractor) {
        vel = computeCircularVelocity(state.add_start_world, prev.attractor);
      }
    }
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
    else if (type === 'Comet') new_obj = new Comet(state.add_start_world, vel);
    else if (type === 'BlackHole') {
      const randomMass = generateRandomBlackHoleMass();
      new_obj = new BlackHole(state.add_start_world, randomMass, vel, true);
    }

    // NB: Comet is checked before Asteroid and lands in `comets` - it used to
    // be pushed into `asteroids`, so every hand-placed comet behaved as a rock.
    if (new_obj instanceof Comet) comets.push(new_obj);
    else if (new_obj instanceof Planet) planets.push(new_obj);
    else if (new_obj instanceof StarObject) stars.push(new_obj);
    else if (new_obj instanceof Asteroid) asteroids.push(new_obj);
    else if (new_obj instanceof GasGiant) gas_giants.push(new_obj);
    else if (new_obj instanceof NeutronStar) neutron_stars.push(new_obj);
    else if (new_obj instanceof WhiteDwarf) white_dwarfs.push(new_obj);
    else if (new_obj instanceof BlackHole) bh_list.push(new_obj);

    // Announced rather than called directly: controls.js already imports ui.js,
    // and a direct call back would close an import cycle.
    if (new_obj) {
      window.dispatchEvent(
        new CustomEvent('gravitasObjectPlaced', { detail: { object: new_obj } })
      );
    }
    // Clear helper after placement
    state.orbit_helper.preview = null;
    // Clear holding flags
    state.isHolding = false;
    state.holdStart = null;
    state.holdCurrent = null;
    // Clear sticky state after placement
    state.stickyOrbit.active = false;
    state.stickyOrbit.centralId = null;
    state.stickyOrbit.snappedVel = null;
  }
});

// Merge toast removed per request

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
    const anchor = canvasPoint(e);
    const worldPos = screen_to_world(anchor);

    // Update zoom
    state.zoom = newZoom;

    // Calculate where that world position should be on screen with the new zoom
    const newScreenPos = worldToScreen(worldPos, state, canvas);

    // Both in canvas pixels. Mixing the world-to-screen result with a raw
    // clientX here would anchor the zoom to the wrong point at the low tier.
    const deltaX = newScreenPos.x - anchor.x;
    const deltaY = newScreenPos.y - anchor.y;

    state.pan.x -= deltaX;
    state.pan.y -= deltaY;
  },
  { passive: false }
);

/**
 * True when a key event came from somewhere that owns the keyboard.
 *
 * Kept local rather than imported from shortcuts.js: that module is loaded by
 * controls.js, which imports this one, and a static import here would close the
 * cycle for the sake of one predicate.
 *
 * @param {EventTarget} target - Event target
 * @returns {boolean} True if the user is typing
 */
const isTypingTarget = target => {
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable === true
  );
};

window.addEventListener('keydown', e => {
  // Typing into a field must not also drive the simulation. This handler binds
  // bare letters, so without the guard writing a planet's name into a lesson
  // answer pans the view on W, A, S and D, pauses on space and fires a
  // screenshot on P. shortcuts.js already guards its own registry the same way;
  // this listener predates it and was never given the check.
  if (isTypingTarget(e.target)) return;
  // A modifier means the key belongs to the browser or the OS, not to us.
  if (e.metaKey || e.ctrlKey || e.altKey) return;

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
    SETTINGS.sim_speed = adjustSimSpeed(SETTINGS.sim_speed, -1);
    updateSpeedDisplay();
  } else if (e.key === '=' || e.key === '+') {
    SETTINGS.sim_speed = adjustSimSpeed(SETTINGS.sim_speed, +1);
    updateSpeedDisplay();
  } else if (e.key.toLowerCase() === 'p') {
    takeScreenshot();
  } else if (e.key === 'Escape') {
    debugLog('Escape key pressed, inspector_open:', state.inspector_open);
    if (state.inspector_open) {
      hideObjectInspector();
    }
  }
});

// Button event handlers
document.getElementById('inspectorClose').onclick = hideObjectInspector;
const inspectorCloseChip = document.getElementById('inspectorCloseChip');
if (inspectorCloseChip) inspectorCloseChip.onclick = hideObjectInspector;

// Delete object functionality
const deleteSelectedObject = () => {
  if (state.selectedObject && state.selectedObject.object) {
    const object = state.selectedObject.object;
    const type = state.selectedObject.type;

    // Clear energy history for the object being deleted
    if (object.id) {
      clearObjectEnergyHistory(object.id);
      debugLog(`Cleared energy history for deleted ${type}: ${object.id}`);
    }

    // Mark the object as dead so it gets removed in the next physics update
    object.alive = false;

    // Close the inspector
    hideObjectInspector();

    // Show a brief notification
    debugLog(`Deleted ${type}: ${object.id}`);
  }
};

document.getElementById('inspectorDelete').onclick = deleteSelectedObject;
setupReferenceFrameControl();
const inspectorPinBtn = document.getElementById('inspectorPin');
if (inspectorPinBtn) inspectorPinBtn.onclick = pinCurrentObject;
// Cards are positioned in viewport coordinates against the inspector's edge,
// so a resize has to re-run the layout or they end up off screen.
window.addEventListener('resize', () => {
  const panel = document.getElementById('objectInspector');
  // A window that narrows can push a docked panel over the readout it was
  // measured to clear, so the measurement has to be redone.
  if (panel && state.inspector_open) dockInspector(panel);
  layoutPinnedCards();
});

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
  setSettings(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
  SETTINGS.preset_scenario = 'Binary BH'; // Ensure default scenario
  initialize_simulation();
  state.paused = false;
  show_scenario_info();
  updateSpeedDisplay();
};
document.getElementById('saveBtn').onclick = save_simulation_state;
document.getElementById('loadBtn').onclick = load_simulation_state;
// Settings that describe how the simulation is *built* - changing any of them
// genuinely requires a rebuild. Everything else is presentation or a live
// physics knob and can be applied to the running simulation, so that adjusting
// a trail style no longer throws away the system you were watching.
const REBUILD_KEYS = new Set([
  'preset_scenario',
  'num_planets',
  'num_gas_giants',
  'num_stars',
  'num_asteroids',
  'num_comets',
  'num_neutron_stars',
  'num_white_dwarfs',
  'num_black_holes',
  'bh_mass',
  'use_individual_bh_masses',
  'bh_masses',
  'placement',
  'sim_size',
  'init_velocity',
  'velocity_stddev',
  'enable_asteroids',
]);

/**
 * Which of the pending settings require a full rebuild.
 * @param {Object} next - The staged settings
 * @returns {Array<string>} Names of changed rebuild-scope settings
 */
const changedRebuildKeys = next =>
  [...REBUILD_KEYS].filter(
    k => JSON.stringify(next[k]) !== JSON.stringify(SETTINGS[k])
  );

document.getElementById('settingsApply').onclick = () => {
  const next = JSON.parse(JSON.stringify(localSettings));
  const needsRebuild = changedRebuildKeys(next);
  const starfieldChanged =
    next.star_density !== SETTINGS.star_density ||
    next.show_ambient_lighting !== SETTINGS.show_ambient_lighting;

  setSettings(next);
  document.getElementById('settingsPanel').classList.add('hidden');

  if (needsRebuild.length > 0) {
    initialize_simulation();
    show_scenario_info();
  } else {
    // Live path: push the new values into the physics layer and repaint the
    // background if it depends on anything that changed.
    updatePhysicsSettings(SETTINGS);
    if (starfieldChanged) generateStarfield();
    window.dispatchEvent(
      new CustomEvent('gravitasSettingsApplied', {
        detail: { rebuilt: false },
      })
    );
  }

  state.paused = false;
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
const settingsCloseChip = document.getElementById('settingsCloseChip');
if (settingsCloseChip)
  settingsCloseChip.onclick = () => {
    document.getElementById('settingsPanel').classList.add('hidden');
    state.paused = false;
  };

// Demo mode functionality
let demoModeInterval = null;
let demoModeActive = false;
let demoScenarios = Object.keys(SCENARIO_INFO).filter(key => key !== 'None');
let currentDemoIndex = 0;

const startDemoMode = () => {
  if (demoModeActive) return;

  demoModeActive = true;
  const demoBtn = document.getElementById('demoModeBtn');
  demoBtn.classList.add('active');
  demoBtn.textContent = '⏹️ Stop Demo';

  // Start with a random scenario
  currentDemoIndex = Math.floor(Math.random() * demoScenarios.length);

  const cycleScenario = () => {
    if (!demoModeActive) return;

    const scenario = demoScenarios[currentDemoIndex];
    SETTINGS.preset_scenario = scenario;
    initialize_simulation();
    state.paused = false;
    show_enhanced_scenario_info(scenario);
    updateSpeedDisplay();

    // Move to next scenario (randomly)
    currentDemoIndex = Math.floor(Math.random() * demoScenarios.length);
  };

  // Start cycling every 20 seconds
  demoModeInterval = setInterval(cycleScenario, 20000);

  // Start immediately
  cycleScenario();
};

const stopDemoMode = () => {
  if (!demoModeActive) return;

  demoModeActive = false;
  const demoBtn = document.getElementById('demoModeBtn');
  demoBtn.classList.remove('active');
  demoBtn.textContent = '🎬 Demo Mode';

  if (demoModeInterval) {
    clearInterval(demoModeInterval);
    demoModeInterval = null;
  }
};

document.getElementById('demoModeBtn').onclick = () => {
  if (demoModeActive) {
    stopDemoMode();
  } else {
    startDemoMode();
  }
};

// Cleanup demo mode on page unload
window.addEventListener('beforeunload', () => {
  if (demoModeActive) {
    stopDemoMode();
  }
});

// BH Masses Modal event handlers
document.getElementById('bhMassesDone').onclick = hideBHMassesModal;

// Speed control functionality
document.getElementById('slowDownBtn').onclick = () => {
  SETTINGS.sim_speed = adjustSimSpeed(SETTINGS.sim_speed, -1);
  updateSpeedDisplay();
};

document.getElementById('speedUpBtn').onclick = () => {
  SETTINGS.sim_speed = adjustSimSpeed(SETTINGS.sim_speed, +1);
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
    ...asteroids,
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
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

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

// --- Clip recording -----------------------------------------------------------
//
// A screenshot documents a moment and most of what this simulation shows is
// motion, so the same Capture group also records a stretch of the run to a
// video file. The recorder itself - the compositing, the container choice, the
// byte and time budgets - is in js/capture.js; what is here is the button, the
// indicator and the save, which are the parts that have to know about this
// page.

const recordBtn = document.getElementById('recordBtn');
const recordingBadge = document.getElementById('recordingBadge');
const recordingReadout = document.getElementById('recordingReadout');

/** mm:ss, for the indicator. @param {number} s - Seconds @returns {string} */
const clockText = s => {
  const whole = Math.max(0, Math.floor(s));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

/**
 * Paint the button and the indicator from the recorder's own counters, so the
 * two can never disagree with what is actually being written.
 * @param {object|null} status - recordingStatus(), or null when idle
 */
const paintRecordingState = status => {
  const on = Boolean(status?.recording);
  if (recordBtn) {
    recordBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    recordBtn.textContent = on ? t('rail.record.stop') : t('rail.record');
    recordBtn.title = on ? t('rail.record.stop.hint') : t('rail.record.hint');
  }
  if (!recordingBadge || !recordingReadout) return;
  recordingBadge.hidden = !on;
  if (!on) {
    recordingBadge.removeAttribute('data-nearly');
    return;
  }
  const mb = status.bytes / (1024 * 1024);
  const capMb = status.maxBytes / (1024 * 1024);
  recordingReadout.textContent = `REC ${clockText(status.seconds)}  ${mb.toFixed(0)}/${capMb.toFixed(0)} MB`;
  // Within a tenth of either budget the recording is about to stop itself,
  // which is worth a colour rather than a surprise.
  const nearly =
    status.seconds > status.maxSeconds * 0.9 ||
    status.bytes > status.maxBytes * 0.9;
  if (nearly) recordingBadge.setAttribute('data-nearly', 'true');
  else recordingBadge.removeAttribute('data-nearly');
};

/**
 * Save a finished clip, and say why it ended when it was not the user who
 * ended it.
 * @param {Blob|null} blob - The assembled recording
 * @param {object} meta - {reason, seconds, bytes, type}
 */
const saveRecording = (blob, meta) => {
  setCaptureMode(false);
  paintRecordingState(null);
  if (!blob || !blob.size) {
    toast(t('capture.record.failed'));
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `gravitas-clip-${Date.now()}.${extensionFor(meta.type)}`;
  link.href = url;
  link.click();
  // The Blob is the last thing holding the recording; the URL keeps it alive
  // until it is revoked, so it is revoked as soon as the download has taken
  // its reference.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  const mb = (meta.bytes / (1024 * 1024)).toFixed(1);
  if (meta.reason === 'size') toast(t('capture.record.cappedSize', { mb }));
  else if (meta.reason === 'duration')
    toast(t('capture.record.cappedTime', { mb }));
  else toast(t('capture.record.saved', { s: clockText(meta.seconds), mb }));
};

const toggleRecording = () => {
  if (isRecording()) {
    stopRecording('user');
    return;
  }
  // The clip carries the same provenance a still does: the scenario title, the
  // scale bar and the simulated clock, burned in for every frame of it.
  setCaptureMode(true, { caption: captureCaption() });
  const started = startRecording({
    sources: [starfieldCanvas, canvas],
    onTick: status => {
      // Re-read the caption rather than holding the one the take started with:
      // a lecturer who loads a second scenario mid-clip would otherwise have
      // the rest of the recording labelled with the first one's name.
      setCaptureMode(true, { caption: captureCaption() });
      paintRecordingState(status);
    },
    onStop: saveRecording,
  });
  if (!started) {
    setCaptureMode(false);
    toast(t('capture.record.unsupported'));
    return;
  }
  paintRecordingState(recordingStatus());
};

if (recordBtn) {
  // Nothing to offer where MediaRecorder or captureStream is missing: a button
  // that can only apologise is worse than no button.
  if (!canRecord()) recordBtn.hidden = true;
  else recordBtn.onclick = toggleRecording;
}

// A language change rewrites every data-i18n element from its key, which would
// put "Record Clip" back on a button that is currently recording.
onLocaleChange(() => {
  if (isRecording()) paintRecordingState(recordingStatus());
});

// Leaving the page mid-take releases the encoder and the chunks it is holding.
// The file is lost - a download cannot be started from a page that is going
// away - but a take that is abandoned should not also leave a recorder running
// against a canvas that is about to be torn down.
window.addEventListener('pagehide', () => {
  if (isRecording()) stopRecording('user');
});

// --- Measurement tools --------------------------------------------------------
//
// The buttons only toggle state; every tool draws itself from the render loop
// and reads the world through the same transform the bodies are drawn with. See
// js/sandboxTools.js for why the handles are stored in world coordinates.

const stopwatchControls = document.getElementById('stopwatchControls');
const stopwatchLatchBtn = document.getElementById('stopwatchLatch');

/** Push the tools' state back onto their buttons. */
const syncToolButtons = () => {
  const pairs = [
    ['toggleRuler', 'ruler'],
    ['toggleProtractor', 'protractor'],
    ['toggleStopwatch', 'stopwatch'],
  ];
  for (const [id, name] of pairs) {
    const el = document.getElementById(id);
    if (el) el.setAttribute('aria-pressed', String(isToolActive(name)));
  }
  if (stopwatchControls) stopwatchControls.hidden = !isToolActive('stopwatch');
  if (stopwatchLatchBtn) {
    stopwatchLatchBtn.setAttribute('aria-pressed', String(!!stopwatchTarget()));
  }
};

const wireToolToggle = (id, name) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.onclick = () => {
    toggleTool(name, canvas);
    syncToolButtons();
  };
};
wireToolToggle('toggleRuler', 'ruler');
wireToolToggle('toggleProtractor', 'protractor');
wireToolToggle('toggleStopwatch', 'stopwatch');

const wireStopwatch = (id, fn) => {
  const el = document.getElementById(id);
  if (el) {
    el.onclick = () => {
      fn();
      syncToolButtons();
    };
  }
};
wireStopwatch('stopwatchMark', () => {
  // A manual mark takes the clock off the latch: the two would otherwise both
  // be resetting the same interval and the reading would be whichever fired
  // last, which is not a measurement of anything.
  latchStopwatchTo(null);
  stopwatch().mark();
});
wireStopwatch('stopwatchStop', () => stopwatch().stop());
wireStopwatch('stopwatchReset', () => {
  latchStopwatchTo(null);
  stopwatch().reset();
});
wireStopwatch('stopwatchLatch', () => {
  if (stopwatchTarget()) {
    latchStopwatchTo(null);
    stopwatch().reset();
    return;
  }
  const selected = state.selectedObject && state.selectedObject.object;
  if (!selected) {
    toast(t('stopwatch.needBody'));
    return;
  }
  stopwatch().reset();
  latchStopwatchTo(selected);
});
syncToolButtons();

// --- Choosing what to add, and meaning to add it -----------------------------
//
// This button used to cycle: one click advanced to the next of eight types and
// left-click on the canvas placed one immediately. Two things were wrong with
// that.
//
// Reaching a type took up to seven clicks with no way to see the list, and the
// only feedback was the button's own caption changing.
//
// Worse, placement was always live. A click on empty canvas added a body, so
// aiming at a small planet to open its inspector and missing by a few pixels
// created a star instead - in a simulation where an unwanted mass perturbs
// everything else immediately. Touch never had this problem: a finger has to
// long-press to arm placement, because a single touch had to stay free for
// panning. The mouse now works the way touch already did.
//
// So: the button opens a picker, choosing a type arms placement, and only then
// does a click on empty space place anything. Escape disarms, as does clicking
// the button again or placing with `add_once` set. The armed state is UI state
// and deliberately not a setting - it is not carried in a share link, and a
// rebuilt world starts disarmed.
const objectPicker = document.getElementById('objectTypePicker');
const objectAddWrap = document.getElementById('objectAdd');

/** Is placement currently armed, and with which type. */
let addArmed = false;

const closeObjectPicker = () => {
  if (!objectPicker) return;
  objectPicker.hidden = true;
  document
    .getElementById('objectTypeBtn')
    ?.setAttribute('aria-expanded', 'false');
};

/**
 * Arm or disarm placement.
 *
 * @param {boolean} on - Whether a click on empty canvas should place a body
 */
const setAddArmed = on => {
  // A lesson that locks the world sets interactive_add to false; arming has to
  // respect that rather than route around it.
  addArmed = Boolean(on) && SETTINGS.interactive_add !== false;
  document.body.classList.toggle('is-adding', addArmed);
  if (!addArmed) {
    state.adding_mass = false;
    state.isDragging = false;
    state.isHolding = false;
  }
  updateObjectTypeButton();
};

/** Whether a press on empty canvas should create something. */
const placementArmed = () => addArmed && SETTINGS.interactive_add !== false;

/**
 * Match the add control to whether placement is allowed at all.
 *
 * Exported for the lesson runner. A step that locks placement clears
 * interactive_add, and placementArmed() honours that on its own - but the
 * crosshair and the lit button would go on promising a click that now does
 * nothing, and the picker would still open, over the lesson panel it is
 * anchored beside on a narrow window. Disabling the button says the same thing
 * once, in the place the reader is looking.
 */
const syncPlacementAvailability = () => {
  const locked = SETTINGS.interactive_add === false;
  const btn = document.getElementById('objectTypeBtn');
  if (btn) {
    btn.disabled = locked;
    btn.setAttribute('aria-disabled', String(locked));
  }
  if (locked) {
    closeObjectPicker();
    setAddArmed(false);
  }
};

const buildObjectPicker = () => {
  if (!objectPicker) return;
  objectPicker.innerHTML = '';

  const list = document.createElement('div');
  list.className = 'object-picker-grid';
  objectTypes.forEach((entry, index) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'object-picker-item';
    item.setAttribute('role', 'menuitemradio');
    item.setAttribute(
      'aria-checked',
      String(index === currentTypeIndex && addArmed)
    );
    item.dataset.objectType = entry.type;
    item.innerHTML =
      `<span class="object-picker-emoji" aria-hidden="true">${entry.emoji}</span>` +
      `<span class="object-picker-name"></span>`;
    item.querySelector('.object-picker-name').textContent = t(entry.label);
    item.onclick = () => {
      currentTypeIndex = index;
      setAddArmed(true);
      closeObjectPicker();
    };
    list.appendChild(item);
  });
  objectPicker.appendChild(list);

  const stop = document.createElement('button');
  stop.type = 'button';
  stop.className = 'object-picker-stop';
  stop.setAttribute('role', 'menuitem');
  stop.textContent = t('rail.objectType.stop');
  stop.onclick = () => {
    setAddArmed(false);
    closeObjectPicker();
  };
  objectPicker.appendChild(stop);
};

document.getElementById('objectTypeBtn').onclick = event => {
  event.stopPropagation();
  if (!objectPicker) return;
  // Armed already: the button is the off switch, so a reader who armed by
  // accident can undo it with the control they just used.
  if (addArmed) {
    setAddArmed(false);
    closeObjectPicker();
    return;
  }
  const opening = objectPicker.hidden;
  if (opening) buildObjectPicker();
  objectPicker.hidden = !opening;
  document
    .getElementById('objectTypeBtn')
    ?.setAttribute('aria-expanded', String(opening));
  if (opening) objectPicker.querySelector('.object-picker-item')?.focus();
};

document.addEventListener('click', event => {
  if (!objectPicker || objectPicker.hidden) return;
  if (!objectAddWrap?.contains(event.target)) closeObjectPicker();
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (objectPicker && !objectPicker.hidden) {
    closeObjectPicker();
    document.getElementById('objectTypeBtn')?.focus();
    return;
  }
  if (addArmed) setAddArmed(false);
});

// Mobile instructions close button
document.getElementById('closeMobileInstructions').onclick = () => {
  document.getElementById('mobileInstructions').style.display = 'none';
};
// Mobile menu functionality
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const uiRail = document.querySelector('.ui-container');

// The narrow-screen menu used to be a second copy of the control rail: parallel
// markup with `mobile*` ids and ~260 lines of duplicated handlers, including a
// divergent scenario list that skipped the HTML sanitising the desktop one did.
// The hamburger now opens the rail itself, so there is one set of controls and
// one set of behaviors at every width.
if (mobileMenuToggle && uiRail) {
  const closeRail = () => {
    mobileMenuToggle.classList.remove('active');
    mobileMenuToggle.setAttribute('aria-expanded', 'false');
    uiRail.classList.remove('is-open');
  };

  mobileMenuToggle.addEventListener('click', e => {
    e.stopPropagation();
    const open = uiRail.classList.toggle('is-open');
    mobileMenuToggle.classList.toggle('active', open);
    mobileMenuToggle.setAttribute('aria-expanded', String(open));
  });

  // Any control in the rail dismisses the menu once it has run.
  uiRail.addEventListener('click', e => {
    if (e.target.closest('button') && uiRail.classList.contains('is-open')) {
      closeRail();
    }
  });

  document.addEventListener('click', e => {
    if (!uiRail.classList.contains('is-open')) return;
    if (mobileMenuToggle.contains(e.target) || uiRail.contains(e.target))
      return;
    closeRail();
  });

  window.addEventListener('gravitasEscape', closeRail);
}

// Scenario info box close button
const closeScenarioInfoBtn = document.getElementById('closeScenarioInfo');
if (closeScenarioInfoBtn) {
  // Add multiple event listeners to ensure it works
  closeScenarioInfoBtn.addEventListener('click', e => {
    debugLog('Close scenario info button clicked');
    e.preventDefault();
    e.stopPropagation();
    const infoBox = document.getElementById('scenarioInfoBox');
    if (infoBox) {
      debugLog('Removing showUI class from scenario info box');
      debugLog('Before removal - classes:', infoBox.className);
      infoBox.classList.remove('showUI');
      infoBox.classList.remove('show'); // Also remove show class for compatibility
      debugLog('After removal - classes:', infoBox.className);
    } else {
      console.error('Scenario info box element not found');
    }
  });

  // Also add mousedown event as backup
  closeScenarioInfoBtn.addEventListener('mousedown', e => {
    debugLog('Close scenario info button mousedown');
    e.preventDefault();
    e.stopPropagation();
    const infoBox = document.getElementById('scenarioInfoBox');
    if (infoBox) {
      debugLog('Removing showUI class from scenario info box (mousedown)');
      infoBox.classList.remove('showUI');
      infoBox.classList.remove('show'); // Also remove show class for compatibility
    }
  });
} else {
  console.error('Close scenario info button not found');
}

/**
 * Load a built-in scenario by its SCENARIO_INFO key.
 *
 * The one authoritative way to switch scenario from the UI. The scenario
 * browser and the welcome screen's featured gallery both call this, so the two
 * cannot drift: an unknown key is refused in one place, the rebuild happens in
 * one place, and the readouts that depend on the new world are refreshed in one
 * place.
 *
 * @param {string} key - A key of SCENARIO_INFO
 * @returns {boolean} True if the scenario existed and was loaded
 */
export function loadScenarioByKey(key) {
  if (!key || !SCENARIO_INFO[key]) {
    console.warn(`Unknown scenario key: ${key}`);
    return false;
  }
  SETTINGS.preset_scenario = key;
  // The rebuild raises the scenario card itself, through apply_preset, so this
  // must not call show_enhanced_scenario_info() as well: a second call stacks a
  // second 18-second auto-hide timer on the same element.
  initialize_simulation();
  // The small transient readout over the canvas. It refuses to fire before the
  // user has interacted and in the first few hundred frames, which is what
  // keeps it off the screen during start-up.
  show_scenario_info();
  updateSpeedDisplay();
  return true;
}

// The scenario gallery lives in js/scenarioBrowser.js. It renders the catalog,
// the concept chips and the search, and calls loadScenarioByKey() above when a
// card is chosen. It used to be built inline here, which put four hundred lines
// of list markup in the middle of the simulation module.

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
      issues.push(
        `Title too long for scenario: ${key} (${info.title.length} chars)`
      );
    }

    if (info.summary && info.summary.length > 500) {
      issues.push(
        `Summary too long for scenario: ${key} (${info.summary.length} chars)`
      );
    }

    // The gallery browses by concept and shows a picture, so a scenario with
    // no tags is unreachable through the chips and one with no thumbnail shows
    // a placeholder. Neither is fatal, which is why this warns rather than
    // throwing: a scenario added before its thumbnail is captured should still
    // load and still be searchable.
    if (!Array.isArray(info.tags) || info.tags.length === 0) {
      issues.push(`No concept tags for scenario: ${key}`);
    } else {
      const seen = new Set();
      for (const tag of info.tags) {
        if (!SCENARIO_TAGS[tag]) {
          issues.push(`Unknown tag "${tag}" on scenario: ${key}`);
        }
        if (seen.has(tag)) {
          issues.push(`Duplicate tag "${tag}" on scenario: ${key}`);
        }
        seen.add(tag);
      }
      if (info.tags.length > 4) {
        issues.push(
          `Too many tags on scenario: ${key} (${info.tags.length}); the card shows three`
        );
      }
    }

    if (!info.thumbnail || typeof info.thumbnail !== 'string') {
      issues.push(`No thumbnail path for scenario: ${key}`);
    }
  });

  if (issues.length > 0) {
    console.warn('Scenario data validation issues:', issues);
  } else {
    debugLog('All scenario data validated successfully');
  }

  return issues.length === 0;
};

// Run validation on page load
document.addEventListener('DOMContentLoaded', () => {
  validateScenarioData();
});

// Touch event handlers for mobile
canvas.addEventListener(
  'touchstart',
  e => {
    // Only call preventDefault if necessary (e.g., for custom drag/zoom)
    if (e.touches.length === 1) {
      e.preventDefault(); // Required to prevent scrolling during drag/zoom
    }
    const touchCount = e.touches.length;

    // Mark that user has interacted with the page
    state.user_has_interacted = true;

    if (touchCount === 1) {
      const touch = e.touches[0];
      const touchStartPos = canvasPoint(touch);

      // Was: a bounding-box test against .ui-container. On mobile that element
      // is the closed menu - still laid out, just visibility:hidden - so its
      // 340x697 rect swallowed 78% of the screen and the canvas was mostly
      // untouchable. elementFromPoint only reports what is actually hit-
      // testable, so a hidden panel no longer blocks anything.
      const hit = document.elementFromPoint(touchStartPos.x, touchStartPos.y);
      if (
        hit &&
        hit !== canvas &&
        hit.closest(
          'button, input, select, a, [role="dialog"], .ui-container, #overlay, .timeline-bar'
        )
      ) {
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

      // A fresh touch must not inherit the previous one's position, or the
      // first move jumps by the distance between them.
      state.lastTouchPos = touchStartPos;

      if (placementArmed()) {
        if (!isFinite(worldPos.x) || !isFinite(worldPos.y)) {
          console.warn('Invalid world coordinates:', worldPos);
          return;
        }

        // Touch drag pans, the way every map behaves. Placement needs both the
        // picker's arming and a long press: the long press alone was already
        // deliberate enough to pan safely, and requiring the picker as well
        // keeps one rule for what "about to add something" means.
        state.touchHoldTimer = setTimeout(() => {
          if (!state.touch_active) return;
          state.adding_mass = true;
          state.isDragging = true;
          state.add_start_screen = touchStartPos;
          state.add_start_world = worldPos;
          state.dragStart = { ...worldPos };
          state.dragCurrent = { ...worldPos };
          if (navigator.vibrate) navigator.vibrate(12);
          window.dispatchEvent(new CustomEvent('gravitasPlacementArmed'));
        }, LONG_PRESS_MS);
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
      const currentPos = canvasPoint(touch);

      // Moving means this is a drag, not a hold: cancel the pending arm.
      if (state.touchHoldTimer && !state.adding_mass) {
        const moved = Math.hypot(
          currentPos.x - (state.add_start_screen?.x ?? currentPos.x),
          currentPos.y - (state.add_start_screen?.y ?? currentPos.y)
        );
        if (moved > 10) {
          clearTimeout(state.touchHoldTimer);
          state.touchHoldTimer = null;
        }
      }

      if (state.adding_mass) {
        state.dragCurrent = screen_to_world(currentPos);
        updateOrbitHelper(false);
      } else {
        // Pan the view
        const deltaX = currentPos.x - (state.lastTouchPos?.x || currentPos.x);
        const deltaY = currentPos.y - (state.lastTouchPos?.y || currentPos.y);
        state.pan.x += deltaX;
        state.pan.y += deltaY;
      }

      state.lastTouchPos = currentPos;
    } else if (touchCount === 2) {
      // A second finger cancels placement and switches to pinch-zoom.
      if (state.touchHoldTimer) {
        clearTimeout(state.touchHoldTimer);
        state.touchHoldTimer = null;
      }
      state.adding_mass = false;
      state.isDragging = false;
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
        // Was clamped to +/-5% per frame, which made pinching feel like it
        // barely responded. A wider clamp still guards against a jump if a
        // touch is momentarily lost.
        const limitedZoomFactor = Math.max(0.7, Math.min(zoomFactor, 1.4));

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
  // Must be non-passive: this handler calls preventDefault to stop the page
  // rubber-banding while you drag the simulation. As a passive listener the
  // call was silently ignored.
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

        // Validate both start and end world coordinates
        if (
          isNaN(add_end_world.x) ||
          isNaN(add_end_world.y) ||
          !isFinite(add_end_world.x) ||
          !isFinite(add_end_world.y) ||
          isNaN(state.add_start_world.x) ||
          isNaN(state.add_start_world.y) ||
          !isFinite(state.add_start_world.x) ||
          !isFinite(state.add_start_world.y)
        ) {
          console.warn(
            'Invalid world coordinates during touch object placement:',
            {
              start: state.add_start_world,
              end: add_end_world,
            }
          );
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

        // Comet first, and else-if throughout: this had the same defect as the
        // mouse path, pushing hand-placed comets into `asteroids`.
        if (new_obj instanceof Comet) comets.push(new_obj);
        else if (new_obj instanceof Planet) planets.push(new_obj);
        else if (new_obj instanceof StarObject) stars.push(new_obj);
        else if (new_obj instanceof Asteroid) asteroids.push(new_obj);
        else if (new_obj instanceof GasGiant) gas_giants.push(new_obj);
        else if (new_obj instanceof NeutronStar) neutron_stars.push(new_obj);
        else if (new_obj instanceof WhiteDwarf) white_dwarfs.push(new_obj);
        else if (new_obj instanceof BlackHole) bh_list.push(new_obj);

        if (new_obj) {
          window.dispatchEvent(
            new CustomEvent('gravitasObjectPlaced', {
              detail: { object: new_obj },
            })
          );
        }

        state.adding_mass = false;
        state.isDragging = false;
        state.orbit_helper.preview = null;
      }

      state.touch_active = false;
      state.touch_id = null;
      state.lastTouchPos = null;
    }

    // Reset the pinch baseline whenever fewer than two fingers remain, or
    // lifting one finger of a pinch makes the next one jump.
    if (touchCount < 2) state.lastTouchDistance = 0;

    if (state.touchHoldTimer) {
      clearTimeout(state.touchHoldTimer);
      state.touchHoldTimer = null;
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
  setAreaSweepWedges,
  getAreaSweepWedges,
  showAreaSweepFor,
  setAreaSweepSuppressed,
  isAreaSweepSuppressed,
  checkAreaSweepValidity,
  captureShareState,
  applyShareState,
  markWorldTouched,
  setInspectorSuppressed,
  syncPlacementAvailability,
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
// Tutorial lives in js/tutorial.js - see initTutorial(), wired from main.js.

// Helper: Ensure no two objects are initialized within a minimum separation distance
// Removed unused ensureMinSeparation helper

// Helper: Place an object with minimum separation, retrying up to maxTries
// (Removed unused placeWithSeparation helper)

// Helper: Get tooltip text for object properties
function getStatTooltip(statLabel, _objectType) {
  const tooltips = {
    Mass: 'Total mass. Determines gravitational strength and orbital dynamics.',
    Radius: 'Physical size. Affects collision detection and visual appearance.',
    Position: 'Current location in simulation space (x, y coordinates).',
    Velocity:
      'Speed and direction of movement. Determines kinetic energy and trajectory.',
    Speed: 'Magnitude of velocity (how fast the object is moving).',
    Distance: 'Distance from center of simulation or reference point.',
    'Orbital Period': 'Time for one complete orbit around primary object.',
    'Escape Velocity':
      'Minimum speed needed to escape gravitational influence.',
    'Surface Gravity': "Gravitational acceleration at object's surface.",
    Density: 'Mass per unit volume. Determines how compact the object is.',
    Temperature: 'Surface temperature (for stars and some planets).',
    'Surface Temperature':
      "Temperature at star's surface. Determines color and spectral type.",
    Luminosity: 'Total energy output per second (for stars).',
    Age: 'How long the object has existed in simulation.',
    'Life Expectancy': 'Estimated remaining lifetime (for stars).',
    Lifespan:
      'Total expected lifetime of the star. More massive stars live shorter lives.',
    'Spectral Type':
      'Star classification (O, B, A, F, G, K, M). Based on temperature and color.',
    'Event Horizon':
      'Boundary around black hole from which nothing can escape.',
    'Schwarzschild Radius':
      'Event horizon radius. Point of no return where escape velocity equals light speed.',
    'Escape Velocity at Rs':
      'Escape speed at Schwarzschild radius. Always equals light speed (100%).',
    'Average Density':
      'Mass per volume within event horizon. Extremely high density.',
    'Hawking Temperature':
      'Temperature of Hawking radiation. Smaller black holes are hotter.',
    'Hawking Lifetime':
      'Time until complete evaporation via Hawking radiation. Larger holes live longer.',
    'ISCO Period':
      'Orbital period at Innermost Stable Circular Orbit (3x Schwarzschild radius).',
    Type: 'Classification: Primordial, Stellar-Mass, Intermediate, or Supermassive.',
    'Accretion Rate': 'Rate at which matter falls into a black hole.',
    Spin: 'Rotational angular momentum of the object.',
    'Magnetic Field': "Strength of the object's magnetic field.",
    Atmosphere: 'Presence and composition of gaseous envelope.',
    Composition: "Chemical makeup of the object's material.",
    'Trail Length':
      "Number of positions recorded in the object's motion trail.",
    'Collision Count': 'Number of times this object has collided with others.',
    Energy: 'Total mechanical energy (kinetic + potential).',
    'Angular Momentum': "Rotational momentum around the object's axis.",
    'Tidal Force': 'Gravitational force gradient across the object.',
    'Roche Limit':
      'Distance at which tidal forces would break apart the object.',
    'Hill Sphere':
      "Region where the object's gravity dominates over other bodies.",
  };

  return tooltips[statLabel] || null;
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
      resetFrame();
      resetTrailTick();

      // Reset view to default
      state.zoom = 1.0;
      state.pan = { x: 0.0, y: 0.0 };

      // Hide inspector and scenario info
      hideObjectInspector && hideObjectInspector();
      const scenarioInfoDiv = document.getElementById('scenarioInfoDisplay');
      if (scenarioInfoDiv) scenarioInfoDiv.classList.remove('visible');

      // Set scenario to 'None' and update settings
      SETTINGS.preset_scenario = 'None';
      setCurrentScenarioName('None');

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
