// =============================================================================
// The inspector's orbit rows: primary, semi-major axis, eccentricity, period
// -----------------------------------------------------------------------------
// One primary search (js/orbital.js, primaryCandidates and primaryOf, among
// the bodies whose pull the engine applies to this one) and one two-body
// authority (js/twoBodyModel.js: the pair's mu, and whether the force is
// inverse-square over the orbit). A row about the whole orbit is printed only
// where that model says the orbit is a two-body one; otherwise the row says
// why not. Loaded with the inspector card, never at start-up.
// =============================================================================

import {
  bh_list,
  stars,
  neutron_stars,
  white_dwarfs,
  galaxies,
  gas_giants,
  planets,
} from './physics.js';
import { primaryCandidates, primaryOf, orbitalElements } from './orbital.js';
import { pairElements } from './twoBodyModel.js';
import { gravityRoles } from './engine/sources.js';
import { twoBodyModel } from './twoBodyModel.js';
import { twoBodySettings } from './twoBodySettings.js';
import { formatDistance, timeUnitSeconds } from './units.js';
import { formatNumber, withUnit } from './format.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_INSPECTORORBIT } from './i18n/en.inspectorOrbit.js';
import { ES_INSPECTORORBIT } from './i18n/es.inspectorOrbit.js';

registerMessages('en', EN_INSPECTORORBIT, true);
registerMessages('es', ES_INSPECTORORBIT, true);

/**
 * What can be said about a body's orbit now.
 *
 * `state` is `no-primary` (nothing the engine lets pull on it), `softened`
 * or `mond` (the force is not inverse-square at the current separation or
 * the periapsis), `unbound`, or `bound`. The elements use the pair's own mu:
 * G(M + m) when each pulls the other, G M when only the primary pulls.
 *
 * @param {Object} body - The selected body
 * @param {Object} [settings] - As twoBodyModel's; the live engine's by default
 * @param {Object} [lists] - The engine's lists by name; js/physics.js by default
 * @returns {{state: string, primary?: Object, model?: Object, el?: Object,
 *   approximate?: boolean}} The readout
 */
export function orbitReadout(
  body,
  settings = twoBodySettings(),
  lists = engineLists()
) {
  if (!body?.pos || !body?.vel) return { state: 'no-primary' };
  const { pulls } = gravityRoles(settings);
  const primary = primaryOf(
    body,
    primaryCandidates(lists, body, c => pulls(c.kind, body.kind))
  );
  if (!primary) return { state: 'no-primary' };
  const now = twoBodyModel(body, primary, settings);
  if (!now || now.pairClass === 'none') return { state: 'no-primary', primary };
  if (!now.inverseSquare) return { state: now.domain, primary, model: now };
  // The pair's mu goes in through G, as the orbit overlay does it.
  const el = orbitalElements(
    body,
    primary,
    now.mu / (primary.mass + (body.mass || 0))
  );
  if (!el) return { state: 'no-primary', primary };
  if (!el.bound) return { state: 'unbound', primary, model: now, el };
  const model = twoBodyModel(body, primary, settings, [el.r, el.periapsis]);
  if (!model.inverseSquare) return { state: model.domain, primary, model, el };
  return { state: 'bound', primary, model, el, approximate: model.approximate };
}

/**
 * The primary by the shared rule among every candidate, pulling or not: for
 * a measuring tool (js/investigations.js), which says the domain itself.
 * @param {Object} body - The orbiter
 * @param {Object} [lists] - The engine's lists by name
 * @returns {Object|null} The primary
 */
export const primaryFor = (body, lists = engineLists()) =>
  primaryOf(body, primaryCandidates(lists, body));

/**
 * Elements with the pair's own mu, or null without a primary that pulls.
 * @param {Object} body - The orbiter
 * @param {Object|null} primary - From primaryFor
 * @param {Object} [settings] - As twoBodyModel's
 * @returns {Object|null} orbitalElements' result
 */
export const elementsFor = (body, primary, settings = twoBodySettings()) =>
  primary ? pairElements(body, primary, settings) : null;

// Named, not a namespace import: a namespace would put physics.js's whole
// export object into the start-up bundle. Read at call time: the engine
// reassigns its lists.
const engineLists = () => ({
  bh_list,
  stars,
  neutron_stars,
  white_dwarfs,
  galaxies,
  gas_giants,
  planets,
});

const STATE_KEY = {
  'no-primary': 'noPrimary',
  unbound: 'unbound',
  softened: 'softened',
  mond: 'mond',
};

/**
 * A period in simulation time units, as the inspector has always printed it.
 * @param {number} period - Simulation time
 * @returns {string} Hours, days or years
 */
export const formatPeriod = period => {
  const days = (period * timeUnitSeconds()) / 86400;
  if (days > 365) return withUnit(days / 365, 'years');
  if (days < 1) return withUnit(days * 24, 'hours');
  return withUnit(days, 'days');
};

/**
 * The orbit rows for the inspector.
 *
 * Primary always; with a two-body orbit, semi-major axis, eccentricity and
 * period, labelled two-body and marked approximate under a halo whose pull is
 * at least 1 percent of the primary's; without one, the period row says why.
 *
 * @param {Object} body - The selected body
 * @param {Object} [readout] - From orbitReadout
 * @param {Object} [opts] - {elements: false} for the period row alone (a star)
 * @returns {Array<{label: string, value: string, tooltipKey?: string}>} Rows
 */
export function orbitRows(body, readout = orbitReadout(body), opts = {}) {
  const { state, primary, el, approximate } = readout;
  const rows = [];
  if (opts.elements !== false)
    rows.push({
      label: t('inspector.stat.primary'),
      value:
        primary && state !== 'no-primary'
          ? primary.name || t('inspector.orbit.unnamed')
          : t('inspector.orbit.noPrimary'),
    });
  if (state !== 'bound') {
    rows.push({
      label: t('inspector.stat.orbitalPeriod'),
      tooltipKey: 'twoBody',
      value: t(`inspector.orbit.${STATE_KEY[state] || 'noPrimary'}`),
    });
    return rows;
  }
  const mark = text =>
    approximate ? `${text} ${t('inspector.orbit.approximate')}` : text;
  if (opts.elements !== false)
    rows.push(
      {
        label: t('inspector.stat.semiMajorAxis'),
        tooltipKey: 'twoBody',
        value: mark(formatDistance(el.a)),
      },
      {
        label: t('inspector.stat.eccentricity'),
        tooltipKey: 'twoBody',
        value: mark(formatNumber(el.e, { sig: 3, sci: false })),
      }
    );
  rows.push({
    label: t('inspector.stat.orbitalPeriod'),
    tooltipKey: 'twoBody',
    value: mark(formatPeriod(el.period)),
  });
  return rows;
}
