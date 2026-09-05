// =============================================================================
// The astrometry instrument
// -----------------------------------------------------------------------------
// Radial velocity measures the part of the star's wobble that points at us.
// Astrometry measures the part that does not: the tiny ellipse the star traces
// across the sky as the planet swings it around their common center of mass.
//
// The two are complementary rather than redundant, and the panel exists to make
// that concrete. Tilt a system toward face-on and the radial-velocity curve
// flattens to nothing while the astrometric path opens from a line into a
// circle. Neither method is the better one; they fail in opposite directions.
//
// Three things this panel is careful about
// -----------------------------------------------------------------------------
// It is not a picture of the planet. The planet stays invisible throughout. What
// moves is the star, and the plot is the star's position, which is the whole
// reason astrometry can find a world nobody can see.
//
// The physical orbit and the angle it subtends are different quantities. The
// star's reflex orbit is a size in AU and does not care how far away we are;
// the angle we measure it at is that size divided by the distance. Moving the
// system further away shrinks the angle and leaves the orbit alone, and the
// panel shows both numbers so that stays visible.
//
// The angular scale is chosen to be readable. HD 209458 b's signature is 0.56
// microarcseconds. Printing that as 0.00000056 arcseconds is the same number
// written so nobody can read it.
// =============================================================================

import { stars, gas_giants, planets } from './physics.js';
import { state } from './appState.js';
import { SIM_UNITS_PER_AU } from './units.js';
import {
  projectPositionToSky,
  observerGeometry,
  onObserverChange,
} from './observerGeometry.js';
import { chartColors } from './observationChart.js';
import { mountObserverControls } from './observerControls.js';
import { chooseAngularUnit, maxOffsetOfPath } from './exoplanetObservables.js';
import { formatNumber, withUnit } from './format.js';
import { observedStar, starIsHeldFixed } from './radialVelocity.js';
import { t } from './i18n/index.js';
import {
  decideSampling,
  dropInvalidatedSamples,
  sessionChange,
  sessionKey,
} from './observingSession.js';
import { isScrubbing } from './timeline.js';
import { currentTimeDays } from './lightCurve.js';
import {
  layoutObservationPanels,
  noteObservationPanelUsed,
} from './observationLayout.js';

const SAMPLE_INTERVAL_MS = 60;
const MAX_SAMPLES = 1200;

// Used when the scenario carries no measured distance. Ten parsecs is the
// standard reference distance in astronomy, and a round number to reason from.
const DEFAULT_DISTANCE_PC = 10;

/** Fewest recorded points before a maximum offset is worth quoting. */
const MIN_POINTS_FOR_OFFSET = 8;

let enabled = false;
let els = null;
let trail = [];
let lastSampleAt = 0;

/**
 * What the recorded path is a path *of*: one star, from one direction. See
 * js/observingSession.js - a path that concatenates two targets, or two
 * observing directions, is not a measurement of either.
 */
let recordedSession = null;
let lastSampleTime = null;
let sessionNotice = null;
/**
 * Whether the distance was chosen rather than inherited from the scenario.
 *
 * Set by setAssumedDistance(), which is what the input box and a restoring
 * share link both call. Cleared when a new world arrives, because the old
 * reader's assumption is not about the new system.
 */
let distanceIsExplicit = false;
let unsubscribeObserver = null;
let teardownControls = null;
let distancePc = DEFAULT_DISTANCE_PC;
let distanceIsMeasured = false;

/**
 * The system's center of mass, in simulation units.
 *
 * The astrometric orbit is measured about this point, because that is the point
 * the star actually circles.
 *
 * @returns {{x: number, y: number}|null} Barycenter position
 */
function barycenter() {
  const bodies = [...stars, ...gas_giants, ...planets].filter(b => b.alive);
  let m = 0;
  let x = 0;
  let y = 0;
  for (const b of bodies) {
    const bm = b.mass || 0;
    if (!Number.isFinite(bm) || !Number.isFinite(b.pos?.x)) continue;
    m += bm;
    x += bm * b.pos.x;
    y += bm * b.pos.y;
  }
  return m > 0 ? { x: x / m, y: y / m } : null;
}

/**
 * The star's current offset from the barycenter, projected onto the sky.
 *
 * @returns {{skyX: number, skyY: number, au: number, arcsec: number}|null}
 *   Sky-plane offsets in AU and the angle they subtend
 */
export function currentAstrometricOffset() {
  const star = observedStar();
  const bary = barycenter();
  if (!star || !bary) return null;

  const offset = { x: star.pos.x - bary.x, y: star.pos.y - bary.y };
  const sky = projectPositionToSky(offset, observerGeometry());
  const skyAuX = sky.x / SIM_UNITS_PER_AU;
  const skyAuY = sky.y / SIM_UNITS_PER_AU;
  const au = Math.hypot(skyAuX, skyAuY);
  return {
    skyX: skyAuX,
    skyY: skyAuY,
    au,
    // One AU at one parsec subtends one arcsecond, by the definition of the
    // parsec, so the conversion is a division.
    arcsec: au / distancePc,
  };
}

/**
 * The largest offset from the barycenter observed so far.
 *
 * What this is, and what it is not
 * -----------------------------------------------------------------------------
 * This is the maximum projected separation between the star and the barycenter
 * over the samples taken. It used to be described as approximating the
 * semi-major axis of the reflex orbit, and it does not:
 *
 *   eccentricity   the barycenter sits at a *focus* of the star's orbit, so the
 *                  largest offset is the apoapsis distance a(1 + e), not a. For
 *                  a = 1 AU and e = 0.5 that is 1.5 AU - fifty per cent high,
 *                  and reported as a measured semi-major axis it is simply
 *                  wrong.
 *   inclination    the path on the sky is the true orbit projected. For a
 *                  circular orbit the projected ellipse keeps its semi-major
 *                  axis, so the maximum offset is still a_star; for an
 *                  eccentric one the projection depends on where periastron
 *                  falls relative to the line of nodes.
 *   coverage       it is a maximum over what has been seen, so a partial arc
 *                  gives a lower bound.
 *
 * The astrometric signature in the literature is alpha = a_star / d, with
 * a_star the semi-major axis of the star's orbit about the barycenter. Deriving
 * that from a path requires fitting an ellipse and locating its focus, which
 * this panel does not do. So it reports the maximum offset it has actually
 * measured, labelled as that, and leaves alpha to the model widget in the
 * lesson, where the orbital elements are known rather than inferred.
 *
 * @returns {{au: number, arcsec: number}|null} The maximum observed offset
 */
export function maxObservedOffset() {
  const au = maxOffsetOfPath(trail, { minPoints: MIN_POINTS_FOR_OFFSET });
  return au === null ? null : { au, arcsec: au / distancePc };
}

/** @returns {Array<{x: number, y: number}>} The recorded sky path, in AU */
export const astrometryTrail = () => trail.map(p => ({ ...p }));

/** @returns {number} The distance being assumed, in parsecs */
export const getAssumedDistance = () => distancePc;

/**
 * Set the distance the angular scale is computed from.
 *
 * Changes the angle and nothing else. The physical reflex orbit is a property
 * of the system, and the readout keeps showing it so that stays obvious.
 *
 * @param {number} pc - Distance in parsecs
 */
export function setAssumedDistance(pc) {
  const next = Math.max(0.1, Number(pc) || DEFAULT_DISTANCE_PC);
  distanceIsExplicit = true;
  if (next === distancePc) return;
  distancePc = next;
  render();
}

/** Discard the recorded path. */
export function clearAstrometry() {
  trail = [];
  lastSampleAt = 0;
  // A deliberate clear starts a fresh session and carries no explanation.
  lastSampleTime = null;
  sessionNotice = null;
  const star = observedStar();
  recordedSession = sessionKey({
    starId: star ? star.id : null,
    geometry: observerGeometry(),
  });
  render();
}

/** @returns {boolean} Whether the panel is open */
export const isAstrometryEnabled = () => enabled;

function cacheElements() {
  if (els) return els;
  els = {
    container: document.getElementById('astrometryContainer'),
    canvas: document.getElementById('astrometryCanvas'),
    status: document.getElementById('astrometryStatus'),
    target: document.getElementById('astrometryTarget'),
    distance: document.getElementById('astrometryDistance'),
    distanceNote: document.getElementById('astrometryDistanceNote'),
    reflex: document.getElementById('astrometryReflex'),
    signature: document.getElementById('astrometrySignature'),
    position: document.getElementById('astrometryPosition'),
    notice: document.getElementById('astrometryNotice'),
    controls: document.getElementById('astrometryObserverControls'),
    clear: document.getElementById('astrometryClear'),
    close: document.getElementById('astrometryClose'),
    toggle: document.getElementById('toggleAstrometry'),
  };
  return els;
}

/**
 * Adopt the distance the scenario knows about, if it has one.
 *
 * Real systems carry a measured parallax distance. Arbitrary sandbox systems do
 * not, and inventing one would be worse than saying so: the panel falls back to
 * a stated assumption and labels it as an assumption.
 */
function adoptScenarioDistance({ force = false } = {}) {
  // A distance that was set deliberately - typed into the box, or carried by a
  // share link - is the reader's assumption and outranks the scenario's. Opening
  // the panel used to overwrite it unconditionally, so a link that specified a
  // distance lost it the moment anyone looked at the panel it applied to.
  if (distanceIsExplicit && !force) {
    const el = cacheElements();
    if (el.distance) el.distance.value = String(distancePc);
    return;
  }
  const star = observedStar();
  const measured = star?.distancePc;
  if (Number.isFinite(measured) && measured > 0) {
    distancePc = measured;
    distanceIsMeasured = true;
  } else {
    distancePc = DEFAULT_DISTANCE_PC;
    distanceIsMeasured = false;
  }
  const e = cacheElements();
  if (e.distance) e.distance.value = String(distancePc);
}

/**
 * Draw the sky-plane path.
 *
 * Plain canvas rather than a charting library: this is a picture of a shape,
 * with equal scales on both axes, and a chart drawn to fit its data would
 * stretch a circle into an ellipse and destroy the one thing being taught.
 */
function drawSkyPlot() {
  const e = cacheElements();
  const canvas = e.canvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 240;
  const h = canvas.clientHeight || 160;
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const t = chartColors();
  const cx = w / 2;
  const cy = h / 2;

  // Equal scales on both axes, so a circle reads as a circle.
  let extent = 0;
  for (const p of trail)
    extent = Math.max(extent, Math.abs(p.x), Math.abs(p.y));
  const current = currentAstrometricOffset();
  if (current) {
    extent = Math.max(extent, Math.abs(current.skyX), Math.abs(current.skyY));
  }
  if (!(extent > 0)) extent = 1e-6;
  const scale = (Math.min(w, h) / 2 - 18) / extent;

  // Crosshair at the barycenter: the fixed point the star circles.
  ctx.strokeStyle = t.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy);
  ctx.lineTo(cx + 8, cy);
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx, cy + 8);
  ctx.stroke();

  // The path traced so far.
  if (trail.length > 1) {
    ctx.strokeStyle = t.accent;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    trail.forEach((p, i) => {
      const px = cx + p.x * scale;
      const py = cy - p.y * scale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // The star, where it is now.
  if (current) {
    ctx.fillStyle = t.accent;
    ctx.beginPath();
    ctx.arc(cx + current.skyX * scale, cy - current.skyY * scale, 4, 0, 7);
    ctx.fill();
  }

  // Scale bar, so the picture carries its own units.
  const barAu = extent;
  const unit = chooseAngularUnit(barAu / distancePc);
  ctx.strokeStyle = t.tick;
  ctx.fillStyle = t.tick;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, h - 10);
  ctx.lineTo(10 + barAu * scale, h - 10);
  ctx.stroke();
  ctx.font = '9px system-ui, sans-serif';
  ctx.fillText(
    `${formatNumber(unit.value, { sig: 2 })} ${unit.unit}`,
    10,
    h - 14
  );
}

/** Refresh every readout and repaint the plot. */
function render() {
  const e = cacheElements();
  const star = observedStar();
  const pinned = star && starIsHeldFixed();

  if (e.target) e.target.textContent = star ? star.name || 'Star' : 'No star';

  if (e.notice) {
    // A pinned star means nothing can be measured at all, which outranks a
    // restarted session, which only means something else is being measured.
    if (pinned) {
      e.notice.hidden = false;
      e.notice.textContent = t('astrometry.starHeldFixed');
    } else if (sessionNotice) {
      e.notice.hidden = false;
      e.notice.textContent = sessionNotice;
    } else {
      e.notice.hidden = true;
    }
  }

  const sig = maxObservedOffset();
  if (e.reflex) {
    e.reflex.textContent = sig
      ? withUnit(formatNumber(sig.au, { sig: 3 }), 'AU')
      : '—';
  }
  if (e.signature) {
    if (sig) {
      const u = chooseAngularUnit(sig.arcsec);
      e.signature.textContent = withUnit(
        formatNumber(u.value, { sig: 3 }),
        u.unit
      );
    } else {
      e.signature.textContent = t('astrometry.keepObserving');
    }
  }
  if (e.position) {
    const cur = currentAstrometricOffset();
    if (cur) {
      const u = chooseAngularUnit(cur.arcsec);
      e.position.textContent = withUnit(
        formatNumber(u.value, { sig: 2 }),
        u.unit
      );
    } else {
      e.position.textContent = '—';
    }
  }
  if (e.distanceNote) {
    e.distanceNote.textContent = distanceIsMeasured
      ? 'measured for this system'
      : 'assumed: this system has no measured distance';
  }
  if (e.status) {
    e.status.textContent = pinned
      ? 'Star is fixed'
      : `${trail.length} point${trail.length === 1 ? '' : 's'}`;
  }
  drawSkyPlot();
}

/** Sample the star's sky position. Called from the render loop. */
export function updateAstrometry() {
  if (!enabled) return;
  const now = performance.now();
  if (now - lastSampleAt < SAMPLE_INTERVAL_MS) return;
  lastSampleAt = now;

  if (starIsHeldFixed()) {
    render();
    return;
  }

  const star = observedStar();
  const current = sessionKey({
    starId: star ? star.id : null,
    geometry: observerGeometry(),
  });
  const simTime = currentTimeDays();

  const decision = decideSampling({
    recordedSession,
    currentSession: current,
    lastSampleTime,
    simTime,
    paused: Boolean(state?.paused),
    scrubbing: isScrubbing(),
  });

  switch (decision.action) {
    case 'hold':
      render();
      return;

    case 'restart':
      startNewSession(current, decision.reason, star);
      break;

    case 'truncate': {
      const before = trail.length;
      trail = dropInvalidatedSamples(trail, simTime, p => p.t);
      const dropped = before - trail.length;
      lastSampleTime = trail.length ? trail[trail.length - 1].t : null;
      recordedSession = current;
      if (dropped > 0) {
        sessionNotice = t('observing.session.rewound', {
          n: dropped,
          time: formatNumber(simTime, { sig: 3 }),
        });
      }
      break;
    }

    default:
      break;
  }

  const cur = currentAstrometricOffset();
  if (cur) {
    // The simulation time travels with the sample. Without it a path is a bag
    // of positions with no way to tell which came first, which is what made a
    // rewind impossible to clean up and made the panel unable to say anything
    // about when the star was where.
    trail.push({ x: cur.skyX, y: cur.skyY, t: simTime });
    if (trail.length > MAX_SAMPLES) trail.shift();
    recordedSession = current;
    lastSampleTime = simTime;
  }
  render();
}

/**
 * Abandon the recorded path and begin another, saying what moved.
 *
 * @param {object} session - The conditions now in force
 * @param {?string} reason - 'target' or 'geometry'
 * @param {?object} star - The star now being observed, for the message
 */
function startNewSession(session, reason, star) {
  // Nothing recorded means nothing lost, so nothing to announce. This is the
  // ordinary case at the start of a run: a scenario load clears the recording
  // while the world is still being rebuilt, so the session is captured with no
  // star at all, and acquiring one a moment later reads as a target change. It
  // is one - but there is no measurement it invalidated, and telling a reader
  // their recording was restarted before they had one is noise.
  const discarded = trail.length;
  trail = [];
  lastSampleTime = null;
  recordedSession = session;
  sessionNotice = !discarded
    ? null
    : reason === 'target'
      ? t('observing.session.newTarget', {
          name: star?.name || t('observing.session.unnamedStar'),
        })
      : t('observing.session.newGeometry');
}

/**
 * Open or close the instrument.
 * @param {boolean} on - Whether to observe
 */
export function setAstrometryEnabled(on) {
  const e = cacheElements();
  enabled = Boolean(on);
  if (e.container) e.container.style.display = enabled ? '' : 'none';
  if (enabled) noteObservationPanelUsed('astrometryContainer');
  if (e.toggle) {
    e.toggle.setAttribute('aria-pressed', String(enabled));
    e.toggle.classList.toggle('active', enabled);
  }

  if (enabled) {
    adoptScenarioDistance();
    // A path survives the panel closing, but only if nothing moved meanwhile.
    // The observer subscription is released on close, so a geometry change made
    // with the panel hidden was never noticed; the target never was at all.
    {
      const star = observedStar();
      const current = sessionKey({
        starId: star ? star.id : null,
        geometry: observerGeometry(),
      });
      const changed = recordedSession
        ? sessionChange(recordedSession, current)
        : null;
      if (changed) startNewSession(current, changed, star);
      else recordedSession = recordedSession ?? current;
    }
    if (e.controls && !teardownControls) {
      teardownControls = mountObserverControls(e.controls);
    }
    if (!unsubscribeObserver) {
      // A path recorded from one viewing geometry is not a path in another.
      unsubscribeObserver = onObserverChange(() => {
        const now = observedStar();
        startNewSession(
          sessionKey({
            starId: now ? now.id : null,
            geometry: observerGeometry(),
          }),
          'geometry',
          now
        );
        render();
      });
    }
    render();
  } else {
    unsubscribeObserver?.();
    unsubscribeObserver = null;
    teardownControls?.();
    teardownControls = null;
  }

  layoutObservationPanels();
}

/** Wire the panel up. Called once at start-up. */
export function initAstrometry() {
  const e = cacheElements();
  e.toggle?.addEventListener('click', () => setAstrometryEnabled(!enabled));
  e.close?.addEventListener('click', () => setAstrometryEnabled(false));
  e.clear?.addEventListener('click', () => clearAstrometry());
  e.distance?.addEventListener('input', ev => {
    setAssumedDistance(parseFloat(ev.target.value));
    distanceIsMeasured = false;
    render();
  });

  window.addEventListener('gravitasSimulationReset', () => {
    clearAstrometry();
    // A new world, so the previous reader's assumed distance is an assumption
    // about a system that is no longer loaded. Forced past the explicit flag
    // for that reason - and note this event does not fire when a share link is
    // restored, which is what keeps a link's own distance from being undone.
    distanceIsExplicit = false;
    if (enabled) adoptScenarioDistance({ force: true });
  });

  if (e.container) e.container.style.display = 'none';
}
