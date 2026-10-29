// =============================================================================
// The planner's extension for observing strategy (Prompt 214, OBSERVING_STRATEGY.md)
// -----------------------------------------------------------------------------
// js/observingWindow.js and the instrument library are read unchanged: this takes a
// facility's id (or a site as numbers), a target and a run of nights, asks the planner
// for each night's usable intervals (js/instruments/planner.js), draws the weather loss
// (js/kernels/strategy/weather.js, a seeded loss, never a forecast) and places the
// visits (js/kernels/strategy/plan.js). The kernel never imports the sky; the
// nights come in as data, which is what lets it be tested against hand-built nights.
//
// Pure: no DOM, no clock. The first night is a Julian Date, never a reading.
// =============================================================================

import { observingRun, localMidnight } from '../observingWindow.js';
import { observingRunAt } from './planner.js';
import { siteOf } from './index.js';
import { planCampaign } from '../kernels/strategy/plan.js';
import { weatherMask } from '../kernels/strategy/weather.js';

/**
 * The planner's records for a run of nights.
 * @param {object} o
 * @param {string} [o.facility] - an id in the instrument library
 * @param {{latitudeDeg: number, longitudeDeg: number}} [o.site] - or a site as numbers
 * @param {{raDeg: number, decDeg: number}} o.target
 * @param {number} o.startJd - any instant of the first night's local day
 * @param {number} o.nights
 * @param {object} [o.options] - overrides for WINDOW_DEFAULTS
 */
export function nightsFor({
  facility,
  site,
  target,
  startJd,
  nights,
  options,
}) {
  const where = facility ? siteOf(facility) : site;
  const firstMidnightJd = localMidnight(startJd, where.longitudeDeg);
  const args = { target, firstMidnightJd, nights, options };
  return facility
    ? observingRunAt(facility, args)
    : observingRun({ ...args, site });
}

/**
 * A plan: the nights, the weather and the visits with their cost.
 * @param {object} o - the arguments of nightsFor, plus cadence, exposureSeconds,
 *   overheadSeconds and weather: {pClear, persistence, seed} or null
 */
export function planStrategy({
  cadence,
  exposureSeconds,
  overheadSeconds,
  weather = null,
  ...where
}) {
  const nights = nightsFor(where);
  const clear = weather
    ? weatherMask({ nights: nights.length, ...weather })
    : null;
  const plan = planCampaign({
    nights,
    cadence,
    exposureSeconds,
    overheadSeconds,
    clear,
  });
  return { ...plan, nightRecords: nights, clear };
}
