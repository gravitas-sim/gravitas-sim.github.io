// =============================================================================
// The lesson instrument registry
// -----------------------------------------------------------------------------
// A widget is a canvas, some controls and a readout. Lessons name one by id and
// the engine in investigations.js renders it; this file is the single place
// that knows which ones exist, so a lesson never imports a widget directly.
//
// The shape a widget can take:
//
//   controls    sliders, each {id, label, unit, min, max, step, value, decimals}
//   presets     buttons that set several controls at once, with a note
//   actions     buttons that do something: {id, label}, handled by act()
//   compute(v)  derived quantities, shared by draw and readout
//   draw(canvas, v, ctx)     paint it
//   readout(v, ctx)          the rows under the canvas
//   animated    true if it needs a repaint every frame
//   step(v, dt) advance an animation, called once per frame when animated
//   reset(v)    put the animation back to its start
//   act(id, v)  handle an action button
//
// `ctx` is the live simulation context a probe gets, and is only passed to
// widgets that ask for it by declaring `live: true`. Everything else is a
// self-contained model that runs whether or not a simulation is loaded.
// =============================================================================

import { ensureDeferredMessages } from './i18n/deferredMessages.js';
import { TRANSIT_WIDGETS } from './transitWidgets.js';
import { ENERGY_WIDGETS } from './energyWidgets.js';
import { BINARY_WIDGETS } from './binaryWidgets.js';
import { BLACK_HOLE_WIDGETS } from './blackHoleWidgets.js';
import { HABITABILITY_WIDGETS } from './habitabilityWidgets.js';
import { EXOPLANET_WIDGETS } from './exoplanetWidgets.js';
import { TIDAL_WIDGETS } from './tidalWidgets.js';
import { DARK_MATTER_WIDGETS } from './darkMatterWidgets.js';
import { CHAOS_WIDGETS } from './chaosWidgets.js';
import { RESONANCE_WIDGETS } from './resonanceWidgets.js';
import { GW_WIDGETS } from './gwWidgets.js';
import { STELLAR_WIDGETS } from './stellarWidgets.js';
import { STELLAR_EVOLUTION_WIDGETS } from './stellarEvolutionWidgets.js';

// Every widget family's prose lives in the deferred half of the catalogue,
// because nothing in the start-up path can reach one: this registry is
// imported only by the lazy js/investigations.js. That is what keeps eleven
// kilobytes of instrument labels out of everybody's first download.
//
// Registered here rather than left to whoever opened the widget, for the same
// reason js/rvWorkspacePanel.js registers its own: the lesson loader does call
// ensureDeferredMessages() first on the normal path, and a share link, an
// authoring preview or a test that imports a widget module directly does not.
// A readout that prints `resW.row.frame` because of who called it is a bug in
// the widget, not in the caller - which is exactly what happened when these
// families were moved, and what e2e/resonance.spec.js caught.
//
// Fire-and-forget: the registry is data, it has no async entry point, and a
// draw that lands in the same tick as the import still repaints on the next
// frame with the strings in place. Failure is swallowed because a missing
// translation must degrade to an English label rather than break the panel.
ensureDeferredMessages().catch(() => {});

const WIDGETS = [
  ...TRANSIT_WIDGETS,
  ...ENERGY_WIDGETS,
  ...BINARY_WIDGETS,
  ...BLACK_HOLE_WIDGETS,
  ...HABITABILITY_WIDGETS,
  ...EXOPLANET_WIDGETS,
  ...TIDAL_WIDGETS,
  ...DARK_MATTER_WIDGETS,
  ...CHAOS_WIDGETS,
  ...RESONANCE_WIDGETS,
  ...GW_WIDGETS,
  ...STELLAR_WIDGETS,
  ...STELLAR_EVOLUTION_WIDGETS,
];

/**
 * Look up a widget by id.
 * @param {string} id - Widget id from a lesson step
 * @returns {Object|null} The widget, or null
 */
export const getWidget = id => WIDGETS.find(w => w.id === id) || null;

/** @returns {Array} Every registered widget */
export const allWidgets = () => [...WIDGETS];

/**
 * Starting values for a widget's controls, with a step's overrides applied.
 * @param {Object} widget - A widget definition
 * @param {Object} [overrides] - Values from the lesson step
 * @returns {Object} control id -> number
 */
export function widgetDefaults(widget, overrides = {}) {
  const out = {};
  for (const c of widget.controls) out[c.id] = c.value;
  for (const key of Object.keys(overrides)) {
    if (key in out) out[key] = Number(overrides[key]);
  }
  return out;
}
