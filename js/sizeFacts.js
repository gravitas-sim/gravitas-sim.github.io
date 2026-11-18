// =============================================================================
// How much bigger than real a body is drawn, read from the built body
// -----------------------------------------------------------------------------
// One answer for the Sizes statement (js/sizeStatement.js) and the canvas
// description (js/canvasSummary.js). Every figure comes from the body as the
// world built it - Sol is 15 units in `solar-system` and 10 by default
// elsewhere - never from a constructor default. Distances share one scale; sizes
// are not, and by how much depends on the family (js/bodyVisuals.js).
//
// The real radius is the one the inspector reports where it reports one with
// a physical basis: a star's photosphere from its stellar description, a
// planet's and a giant's from the model radius in Earth and Jupiter units
// (js/inspectorInfo.js). The small-body and neutron-star rows of the inspector
// are a "rough conversion" (SANDBOX_INSTRUMENTS.md, What is not done) and are
// not used: those bodies get no real radius here.
// =============================================================================

import { displayRadius, drawnRadiusPx } from './bodyVisuals.js';
import {
  AU_METERS,
  EARTH_RADIUS_M,
  SOLAR_RADIUS_M,
  SIM_UNITS_PER_AU,
  SOLAR_MASS_UNIT,
} from './constants.js';
import { stellarStateFor } from './stellar/state.js';
import { t } from './i18n/index.js';
import { formatNumber } from './format.js';
// From physics.js, not js/engine/bodies.js: this module loads lazily, and a
// lazy module that reaches part of a start-up chunk splits it in two
// (js/instrumentStartup.js says why). physics.js reaches the whole chunk.
import { PLANET_RADIUS, GAS_GIANT_RADIUS } from './physics.js';

/** Families with no size to state: a horizon, a halo, a fragment. */
export const NOT_A_SIZE = Object.freeze(['BlackHole', 'Galaxy', 'Debris']);

/** The readout's word for each family, reused so the names agree. */
const FAMILY_KEY = {
  Star: 'stars',
  GasGiant: 'gasGiants',
  Planet: 'planets',
  Asteroid: 'asteroids',
  Comet: 'comets',
  NeutronStar: 'neutronStars',
  WhiteDwarf: 'whiteDwarfs',
  BlackHole: 'blackHoles',
  Galaxy: 'galaxies',
  Debris: 'debris',
};

/** A family's name in the reader's language ("Planets"). */
export const familyName = family =>
  FAMILY_KEY[family] ? t(`readout.count.${FAMILY_KEY[family]}`) : family;

/** Earth radii in a Jupiter radius, as the inspector converts a giant. */
const EARTHS_PER_JUPITER = 11.2;

/** The display family of an engine body: a StarObject is drawn as a Star. */
export const familyOf = body =>
  body?.kind === 'StarObject' ? 'Star' : body?.kind || '';

/** @returns {?number} The body's real radius in AU, where one is known */
function realRadiusAu(body, family) {
  const m = EARTH_RADIUS_M / AU_METERS;
  if (family === 'Planet') return (body.radius / PLANET_RADIUS) * m;
  if (family === 'GasGiant')
    return (body.radius / GAS_GIANT_RADIUS) * EARTHS_PER_JUPITER * m;
  if (family === 'Star') {
    const r = stellarStateFor(body, SOLAR_MASS_UNIT)?.radiusSun;
    return r > 0 ? (r * SOLAR_RADIUS_M) / AU_METERS : null;
  }
  return null;
}

/**
 * The size facts of one body.
 *
 * @param {Object} body - A built body ({radius, stageRadius?, ...})
 * @param {string} [type] - Its display family; from the body when omitted
 * @param {Object} [view] - {zoom, bodyCount} for the drawn radius in pixels
 * @returns {Object} {family, notModelled} or {family, modelRadius (units),
 *   modelAu, realAu, modelOverReal, drawnUnits, drawnOverReal, drawnPx,
 *   collisionRadius (units)}
 */
export function sizeFacts(body, type, view = {}) {
  const family = type || familyOf(body);
  if (NOT_A_SIZE.includes(family) || !(body?.radius > 0))
    return { family, notModelled: true };
  const modelRadius = body.radius;
  // A lesson's stage radius replaces the drawing, never the model.
  const drawnUnits =
    body.stageRadius > 0
      ? body.stageRadius
      : displayRadius(modelRadius, family);
  const modelAu = modelRadius / SIM_UNITS_PER_AU;
  const realAu = realRadiusAu(body, family);
  const realUnits = realAu ? realAu * SIM_UNITS_PER_AU : null;
  return {
    family,
    notModelled: false,
    modelRadius,
    modelAu,
    realAu,
    modelOverReal: realUnits ? modelRadius / realUnits : null,
    drawnUnits,
    drawnOverReal: realUnits ? drawnUnits / realUnits : null,
    drawnPx:
      view.zoom > 0
        ? body.stageRadius > 0
          ? body.stageRadius * view.zoom
          : drawnRadiusPx(modelRadius, family, view.zoom, view.bodyCount || 0)
        : null,
    // The engine's contact test adds the two model radii (js/engine/collisions.js).
    collisionRadius: modelRadius,
  };
}

/**
 * One row per family present: how many, and the spread of drawn over real.
 *
 * @param {Array} bodies - Live bodies
 * @returns {Array<{family, count, notModelled, lo, hi, loModel, hiModel}>}
 *   In first-seen order; lo and hi are null where no real radius is known
 */
export function familyRows(bodies) {
  const rows = new Map();
  for (const b of bodies || []) {
    if (!b || b.alive === false) continue;
    const f = sizeFacts(b);
    let row = rows.get(f.family);
    if (!row) {
      row = {
        family: f.family,
        count: 0,
        notModelled: f.notModelled,
        lo: null,
        hi: null,
      };
      rows.set(f.family, row);
    }
    row.count++;
    const k = f.drawnOverReal;
    if (k > 0) {
      row.lo = row.lo === null ? k : Math.min(row.lo, k);
      row.hi = row.hi === null ? k : Math.max(row.hi, k);
    }
  }
  return [...rows.values()];
}

/**
 * "440x", or "32x to 440x", in the reader's language.
 * @param {number} lo - Smallest factor
 * @param {number} [hi] - Largest factor
 * @returns {string} Text
 */
export const timesText = (lo, hi = lo) => {
  const f = n => formatNumber(n, { sig: n >= 100 ? 3 : 2 });
  return f(lo) === f(hi)
    ? `${f(lo)}\u00d7`
    : t('sizes.timesRange', { lo: f(lo), hi: f(hi) });
};

/**
 * The sentence the canvas description carries: the selected body's factor,
 * or each family's, so a reader who cannot see the canvas hears the spread.
 * @param {Array} bodies - Live bodies
 * @param {Object} [selected] - The selected body
 * @returns {string} The sentence, or '' when there is nothing to say
 */
export function sizeSentence(bodies, selected) {
  if (selected) {
    const f = sizeFacts(selected);
    if (f.drawnOverReal > 0)
      return t('sizes.summary.selected', {
        name: selected.name || familyName(f.family),
        times: timesText(f.drawnOverReal),
      });
  }
  const list = familyRows(bodies)
    .filter(r => r.lo > 0)
    .map(r => `${familyName(r.family)} ${timesText(r.lo, r.hi)}`);
  return list.length ? t('sizes.summary', { list: list.join(', ') }) : '';
}
