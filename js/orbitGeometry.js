// =============================================================================
// The two-body ellipse a body would follow if only its primary pulled
// -----------------------------------------------------------------------------
// Pure: bodies, sources and resolved settings in, geometry out. The overlay
// (js/orbitGeometryOverlay.js) hands it the engine's own source list and the
// softening, MOND and halo the engine has in force, and draws what it returns.
//
// The primary is the source pulling hardest on the body. Whether an ellipse
// may be drawn at all is twoBodyModel's answer (js/twoBodyModel.js), asked for the
// current separation and for periapsis, because the curve claims the whole
// orbit: a body outside the softening length now that dives inside it at
// periapsis is not on a Kepler ellipse.
// =============================================================================

import { orbitalElements, primaryOf } from './orbital.js';
import { twoBodyModel } from './twoBodyModel.js';

const { Math } = globalThis;

/** Points on the drawn curve. */
export const CURVE_POINTS = 240;

/**
 * Below this eccentricity the direction of periapsis is round-off: the
 * eccentricity vector of a circle is noise of order 1e-16, and an apsis drawn
 * along it would jump about from frame to frame. The claim is made to 1e-9 of
 * a, so below 1e-9 the orbit is a circle and the body's own direction stands
 * in for periapsis.
 */
export const CIRCLE_E = 1e-9;

/** The markers, in the order the keyboard list walks them. */
export const MARKERS = Object.freeze([
  'focus-primary',
  'focus-empty',
  'periapsis',
  'apoapsis',
]);

/** Which part a marker belongs to; a hidden part takes its markers with it. */
export const MARKER_PART = Object.freeze({
  'focus-primary': 'foci',
  'focus-empty': 'foci',
  periapsis: 'apsides',
  apoapsis: 'apsides',
});

/**
 * The pull of each source on the body, strongest first, by the engine's law
 * (G m / d^2 with d floored at the softening length).
 * @param {Object} body - The body
 * @param {Array} sources - Sources it feels
 * @param {number} G - Gravitational constant
 * @param {number} softening - Floor on the distance
 * @returns {Array<{source:Object, pull:number}>} Sorted, strongest first
 */
export function pullsOn(body, sources, G, softening) {
  const out = [];
  const s2 = softening * softening;
  for (const s of sources || []) {
    if (!s || s === body || s.alive === false || !(s.mass > 0)) continue;
    const d2 = (s.pos.x - body.pos.x) ** 2 + (s.pos.y - body.pos.y) ** 2;
    out.push({ source: s, pull: (G * s.mass) / Math.max(d2, s2) });
  }
  return out.sort((a, b) => b.pull - a.pull);
}

/**
 * The geometry, or the reason there is none.
 *
 * @param {Object} body - The selected body
 * @param {Array} sources - The sources the integrator sums for it
 * @param {Object} settings - As twoBodyModel's
 * @returns {Object} {ok:true, primary, model, a, e, p, omega, sense, foci,
 *   apsides, points, secondPullPct} or {ok:false, reason, primary, softening}
 */
export function orbitGeometry(body, sources, settings) {
  if (!body?.pos || !body?.vel) return { ok: false, reason: 'no-primary' };
  const primary = primaryOf(body, sources);
  if (!primary) return { ok: false, reason: 'no-primary' };
  const G = settings.gravitational_constant;
  const softening = settings.softening;
  const fail = reason => ({ ok: false, reason, primary, softening });

  const now = twoBodyModel(body, primary, settings);
  if (!now) return fail('no-primary');
  if (now.pairClass === 'none') return fail('none');
  if (!now.inverseSquare) return fail(now.domain);

  // The pair's mu goes in through G: G' = mu / (M + m) gives it back to rounding.
  const el = orbitalElements(
    body,
    primary,
    now.mu / (primary.mass + (body.mass || 0))
  );
  if (!el || !el.bound || !(el.e < 1)) return fail('unbound');

  const model = twoBodyModel(body, primary, settings, [el.r, el.periapsis]);
  if (!model.inverseSquare) return fail(model.domain);

  const { a, e } = el;
  const omega =
    e < CIRCLE_E
      ? Math.atan2(body.pos.y - primary.pos.y, body.pos.x - primary.pos.x)
      : Math.atan2(body.pos.y - primary.pos.y, body.pos.x - primary.pos.x) -
        el.trueAnomaly;
  const sense = el.angularMomentum < 0 ? -1 : 1;
  const p = a * (1 - e * e);
  const ux = Math.cos(omega);
  const uy = Math.sin(omega);
  const cx = primary.pos.x;
  const cy = primary.pos.y;
  const at = (rr, ang) => ({
    x: cx + rr * Math.cos(ang),
    y: cy + rr * Math.sin(ang),
  });

  const points = new Array(CURVE_POINTS);
  for (let k = 0; k < CURVE_POINTS; k++) {
    const nu = (2 * Math.PI * k) / CURVE_POINTS;
    points[k] = at(p / (1 + e * Math.cos(nu)), omega + sense * nu);
  }

  const pulls = pullsOn(body, sources, G, softening);
  const first = pulls.find(q => q.source === primary);
  const second = pulls.find(q => q.source !== primary);
  const secondPullPct =
    first && second && first.pull > 0 ? (100 * second.pull) / first.pull : 0;

  return {
    ok: true,
    primary,
    model,
    a,
    e,
    p,
    omega,
    sense,
    period: el.period,
    foci: {
      'focus-primary': { x: cx, y: cy },
      'focus-empty': { x: cx - 2 * a * e * ux, y: cy - 2 * a * e * uy },
    },
    apsides: {
      periapsis: { x: cx + a * (1 - e) * ux, y: cy + a * (1 - e) * uy },
      apoapsis: { x: cx - a * (1 + e) * ux, y: cy - a * (1 + e) * uy },
    },
    points,
    secondPull: second && secondPullPct > 1 ? second.source : null,
    secondPullPct,
  };
}

/**
 * Where each visible marker is, keyed by marker id.
 * @param {Object} g - An ok geometry
 * @param {Object} parts - {ellipse, apsides, foci} booleans
 * @returns {Object<string,{x:number,y:number}>} Visible markers only
 */
export function markerPoints(g, parts) {
  const out = {};
  if (!g?.ok) return out;
  for (const id of MARKERS) {
    if (parts?.[MARKER_PART[id]] === false) continue;
    out[id] = g.foci[id] || g.apsides[id];
  }
  return out;
}

/**
 * The marker under a screen point, nearest first, within the target size.
 * @param {Object<string,{x:number,y:number}>} screenMarkers - Screen points
 * @param {{x:number,y:number}} at - The press, screen pixels
 * @param {number} targetPx - Target size (24, or 44 on touch); a press within
 *   half of it of a marker's centre hits it
 * @returns {string|null} Marker id
 */
export function markerAt(screenMarkers, at, targetPx) {
  let best = null;
  let bestD = targetPx / 2;
  for (const [id, s] of Object.entries(screenMarkers)) {
    const d = Math.hypot(s.x - at.x, s.y - at.y);
    if (d <= bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

/**
 * Toggle a marker in a selection of at most two; a third replaces the older.
 * @param {string[]} selected - Current selection, oldest first
 * @param {string} id - Marker to toggle
 * @returns {string[]} The new selection
 */
export function toggleMarker(selected, id) {
  const cur = Array.isArray(selected) ? selected : [];
  if (cur.includes(id)) return cur.filter(x => x !== id);
  return [...cur, id].slice(-2);
}
