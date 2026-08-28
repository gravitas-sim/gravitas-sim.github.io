// =============================================================================
// Units — one place that decides how a quantity is written down
// -----------------------------------------------------------------------------
// The simulation runs in its own units. Two anchors are fixed by the physics
// (1000 mass units = 1 M☉, 1 length unit = 0.01 AU) and the time unit follows
// from requiring the simulation's G to be the real G — the same derivation the
// energy system uses, kept in sync here.
//
// "Simulation" mode shows the raw numbers the integrator works in.
// "Physical" mode shows astronomer-facing units: AU, M☉, km/s, years.
// =============================================================================

import {
  SOLAR_MASS_UNIT,
  EARTH_MASS_UNIT,
  getPhysicsSetting,
} from './physics.js';

const SOLAR_MASS_KG = 1.989e30;
const AU_METERS = 1.496e11;
const G_SI = 6.6743e-11;
const SECONDS_PER_YEAR = 3.15576e7;

const MASS_UNIT_TO_KG = SOLAR_MASS_KG / SOLAR_MASS_UNIT;
const DISTANCE_UNIT_TO_M = AU_METERS / 100; // 1 unit = 0.01 AU

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
 * @param {number} v - Value
 * @param {number} sig - Significant digits
 * @returns {string} Formatted number
 */
export function sig(v, sig = 3) {
  if (!isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a === 0) return '0';
  if (a >= 1e6 || a < 1e-3) return v.toExponential(Math.max(0, sig - 1));
  return Number(v.toPrecision(sig)).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}

/**
 * Format a distance.
 * @param {number} simDistance - Distance in simulation units
 * @returns {string} Formatted distance with unit
 */
export function formatDistance(simDistance) {
  if (!isPhysical()) return `${sig(simDistance)} u`;
  const au = (simDistance * DISTANCE_UNIT_TO_M) / AU_METERS;
  if (Math.abs(au) < 0.01) {
    const km = (simDistance * DISTANCE_UNIT_TO_M) / 1000;
    return `${sig(km)} km`;
  }
  if (Math.abs(au) >= 6.324e4) return `${sig(au / 6.324e4)} ly`;
  return `${sig(au)} AU`;
}

/**
 * Format a mass.
 * @param {number} simMass - Mass in simulation units
 * @returns {string} Formatted mass with unit
 */
export function formatMass(simMass) {
  if (!isPhysical()) return `${sig(simMass)} u`;
  const solar = simMass / SOLAR_MASS_UNIT;
  if (Math.abs(solar) >= 0.05) return `${sig(solar)} M☉`;
  const earths = simMass / EARTH_MASS_UNIT;
  if (Math.abs(earths) >= 0.02) return `${sig(earths)} M⊕`;
  const kg = simMass * MASS_UNIT_TO_KG;
  return `${sig(kg)} kg`;
}

/**
 * Format a speed.
 * @param {number} simSpeed - Speed in simulation units
 * @returns {string} Formatted speed with unit
 */
export function formatSpeed(simSpeed) {
  if (!isPhysical()) return `${sig(simSpeed)} u/t`;
  const ms = simSpeed * velocityUnitToMs();
  const c = 299792458;
  if (Math.abs(ms) >= 0.01 * c) return `${sig(ms / c, 3)} c`;
  return `${sig(ms / 1000)} km/s`;
}

/**
 * Format a duration.
 * @param {number} simTime - Time in simulation units
 * @returns {string} Formatted duration with unit
 */
export function formatTime(simTime) {
  if (!isPhysical()) return `${sig(simTime)} t`;
  const seconds = simTime * timeUnitSeconds();
  const years = seconds / SECONDS_PER_YEAR;
  if (Math.abs(years) >= 1e6) return `${sig(years / 1e6)} Myr`;
  if (Math.abs(years) >= 1e3) return `${sig(years / 1e3)} kyr`;
  if (Math.abs(years) >= 1) return `${sig(years)} yr`;
  const days = seconds / 86400;
  if (Math.abs(days) >= 1) return `${sig(days)} d`;
  return `${sig(seconds / 3600)} h`;
}

/**
 * Format an energy.
 * @param {number} joules - Energy in joules
 * @returns {string} Formatted energy with unit
 */
export function formatEnergy(joules) {
  if (!isFinite(joules)) return '—';
  if (!isPhysical()) return sig(joules);
  return `${sig(joules)} J`;
}

/** @returns {string} Short label for the active mode, for buttons and chips */
export const unitModeLabel = () =>
  mode === 'physical' ? 'Physical units' : 'Sim units';
