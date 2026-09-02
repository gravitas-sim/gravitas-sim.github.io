// =============================================================================
// Units: one place that decides how a quantity is written down
// -----------------------------------------------------------------------------
// The simulation runs in its own units. Two anchors are fixed by the physics
// (1000 mass units = 1 M☉, 1 length unit = 0.01 AU) and the time unit follows
// from requiring the simulation's G to be the real G: the same derivation the
// energy system uses, kept in sync here.
//
// "Simulation" mode shows the raw numbers the integrator works in.
// "Physical" mode shows astronomer-facing units: AU, M☉, km/s, years.
// =============================================================================

import {
  SOLAR_MASS_KG,
  AU_METERS,
  G_SI,
  SECONDS_PER_YEAR,
} from './constants.js';
import { formatNumber, withUnit } from './format.js';
import {
  SOLAR_MASS_UNIT,
  EARTH_MASS_UNIT,
  getPhysicsSetting,
} from './physics.js';

const MASS_UNIT_TO_KG = SOLAR_MASS_KG / SOLAR_MASS_UNIT;

/**
 * Simulation length units in one astronomical unit.
 *
 * This is the anchor the whole distance scale hangs from, and it belongs in
 * exactly one place. The habitable-zone renderer used to carry its own private
 * copy of this number, set to 160, from a time when the Solar System scenario
 * placed Earth at 160 units. The scenario was rebuilt at 100 and the renderer
 * was not, so the ring was drawn sixty percent too far out for a long time.
 */
export const SIM_UNITS_PER_AU = 100;

const DISTANCE_UNIT_TO_M = AU_METERS / SIM_UNITS_PER_AU; // 1 unit = 0.01 AU

/**
 * Convert astronomical units to simulation distance units.
 * @param {number} au - Distance in AU
 * @returns {number} Distance in simulation units
 */
export const auToSim = au => au * SIM_UNITS_PER_AU;

/**
 * Convert simulation distance units to astronomical units.
 * @param {number} units - Distance in simulation units
 * @returns {number} Distance in AU
 */
export const simToAu = units => units / SIM_UNITS_PER_AU;

const MODES = ['physical', 'simulation'];
const STORAGE_KEY = 'gravitas_units';

let mode = 'physical';

/** @returns {string} Current unit mode: 'physical' or 'simulation' */
export const getUnitMode = () => mode;

/** @returns {boolean} True when displaying real-world units */
export const isPhysical = () => mode === 'physical';

/**
 * Set the unit mode and persist it.
 * @param {string} next - 'physical' or 'simulation'
 */
export function setUnitMode(next) {
  mode = MODES.includes(next) ? next : 'physical';
  try {
    window.localStorage?.setItem(STORAGE_KEY, mode);
  } catch {
    /* storage unavailable (private mode, sandboxed iframe) */
  }
  window.dispatchEvent(
    new CustomEvent('gravitasUnitsChanged', { detail: { mode } })
  );
}

/** Cycle between the two modes. @returns {string} The new mode */
export function toggleUnitMode() {
  setUnitMode(mode === 'physical' ? 'simulation' : 'physical');
  return mode;
}

/** Restore the persisted preference. */
export function initUnits() {
  try {
    const saved = window.localStorage?.getItem(STORAGE_KEY);
    if (MODES.includes(saved)) mode = saved;
  } catch {
    /* ignore */
  }
}

// --- Derived scale ------------------------------------------------------------

/** @returns {number} Seconds represented by one simulation time unit */
export function timeUnitSeconds() {
  const G_sim = getPhysicsSetting('gravitational_constant') || 1;
  return Math.sqrt(
    (G_sim * DISTANCE_UNIT_TO_M ** 3) / (G_SI * MASS_UNIT_TO_KG)
  );
}

/** @returns {number} Metres per second represented by one sim velocity unit */
export function velocityUnitToMs() {
  return DISTANCE_UNIT_TO_M / timeUnitSeconds();
}

// --- Formatting ---------------------------------------------------------------

/**
 * Format a number with a sensible number of significant digits.
 *
 * Kept as the name every caller already uses; the typography itself lives in
 * js/format.js so that a canvas label, a chart axis and a PDF cell all reach
 * the same decision.
 *
 * @param {number} v - Value
 * @param {number} digits - Significant digits
 * @returns {string} Formatted number
 */
export function sig(v, digits = 3) {
  return formatNumber(v, { sig: digits });
}

/**
 * Format a distance.
 * @param {number} simDistance - Distance in simulation units
 * @returns {string} Formatted distance with unit
 */
export function formatDistance(simDistance) {
  if (!isPhysical()) return withUnit(sig(simDistance), 'u');
  const au = (simDistance * DISTANCE_UNIT_TO_M) / AU_METERS;
  if (Math.abs(au) < 0.01) {
    const km = (simDistance * DISTANCE_UNIT_TO_M) / 1000;
    return withUnit(sig(km), 'km');
  }
  if (Math.abs(au) >= 6.324e4) return withUnit(sig(au / 6.324e4), 'ly');
  return withUnit(sig(au), 'AU');
}

/**
 * Format a mass.
 * @param {number} simMass - Mass in simulation units
 * @returns {string} Formatted mass with unit
 */
export function formatMass(simMass) {
  if (!isPhysical()) return withUnit(sig(simMass), 'u');
  const solar = simMass / SOLAR_MASS_UNIT;
  if (Math.abs(solar) >= 0.05) return withUnit(sig(solar), 'M☉');
  const earths = simMass / EARTH_MASS_UNIT;
  if (Math.abs(earths) >= 0.02) return withUnit(sig(earths), 'M⊕');
  const kg = simMass * MASS_UNIT_TO_KG;
  return withUnit(sig(kg), 'kg');
}

/**
 * Format a speed.
 * @param {number} simSpeed - Speed in simulation units
 * @returns {string} Formatted speed with unit
 */
export function formatSpeed(simSpeed) {
  if (!isPhysical()) return withUnit(sig(simSpeed), 'u/t');
  const ms = simSpeed * velocityUnitToMs();
  const c = 299792458;
  if (Math.abs(ms) >= 0.01 * c) return withUnit(sig(ms / c, 3), 'c');
  return withUnit(sig(ms / 1000), 'km/s');
}

/**
 * Format a duration.
 * @param {number} simTime - Time in simulation units
 * @returns {string} Formatted duration with unit
 */
export function formatTime(simTime) {
  if (!isPhysical()) return withUnit(sig(simTime), 't');
  const seconds = simTime * timeUnitSeconds();
  const years = seconds / SECONDS_PER_YEAR;
  if (Math.abs(years) >= 1e6) return withUnit(sig(years / 1e6), 'Myr');
  if (Math.abs(years) >= 1e3) return withUnit(sig(years / 1e3), 'kyr');
  if (Math.abs(years) >= 1) return withUnit(sig(years), 'yr');
  const days = seconds / 86400;
  if (Math.abs(days) >= 1) return withUnit(sig(days), 'd');
  return withUnit(sig(seconds / 3600), 'h');
}

/**
 * Format an energy.
 * @param {number} joules - Energy in joules
 * @returns {string} Formatted energy with unit
 */
export function formatEnergy(joules) {
  if (!isFinite(joules)) return '-';
  if (!isPhysical()) return sig(joules);
  return withUnit(sig(joules), 'J');
}

/** @returns {string} Short label for the active mode, for buttons and chips */
export const unitModeLabel = () =>
  mode === 'physical' ? 'Physical units' : 'Sim units';
