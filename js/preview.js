// =============================================================================
// Placement previews
// -----------------------------------------------------------------------------
// What the pointer is about to create, and whether a drawn area-sweep overlay
// still describes the orbit it was drawn for. Three pure functions over the
// view state and the body arrays - no DOM, no panels, no listeners.
//
// They lived in js/ui.js, and js/render.js imported them from there. That was
// the last thing the renderer wanted from the coordinator, and it closed a
// cycle: js/ui.js imports js/render.js for the starfield. The renderer now
// imports this module and does not import js/ui.js at all.
// =============================================================================

import {
  planets,
  asteroids,
  comets,
  gas_giants,
  bh_list,
  stars,
  neutron_stars,
  white_dwarfs,
  gravitational_acceleration,
  getMostMassiveBody,
} from './physics.js';
import { orbitalElements } from './orbital.js';
import { state, SETTINGS } from './appState.js';

// How far the orbit may drift before the drawn wedges stop describing it.
// Generous enough to survive ordinary integrator wobble, tight enough that a
// collision, a mass change or a slingshot retires the overlay immediately.
const SWEEP_STALE_FRACTION = 0.06;

/**
 * Retire the equal-area overlay once it no longer matches the real orbit.
 *
 * The overlay is a snapshot of one particular ellipse. If the body is absorbed,
 * flung onto a different orbit, or has its mass changed, the wedges become a
 * picture of an orbit nothing is on, which is worse than showing nothing.
 *
 * @returns {boolean} True if the overlay is still valid
 */
export const checkAreaSweepValidity = () => {
  const ov = state.areaSweepOverlay;
  if (!ov.active) return false;

  const body = [...planets, ...asteroids, ...comets, ...gas_giants].find(
    o => o.id === ov.objectId
  );
  const parent = ov.parent;
  if (!body || body.alive === false || !parent || parent.alive === false) {
    ov.active = false;
    return false;
  }
  if (ov.a === undefined) return true; // built before this data was recorded

  const el = orbitalElements(body, parent, SETTINGS.gravitational_constant);
  if (!el || !el.bound) {
    ov.active = false;
    return false;
  }
  const dA = Math.abs(el.a - ov.a) / Math.max(ov.a, 1e-9);
  const dE = Math.abs(el.e - ov.e);
  if (dA > SWEEP_STALE_FRACTION || dE > SWEEP_STALE_FRACTION) {
    ov.active = false;
    ov.wedges = [];
    ov.orbitPoints = [];
    return false;
  }
  return true;
};

// Expose drag preview for rendering: returns { position, velocity } or null
export function getDragPreview() {
  if (!state.isDragging) return null;
  const position = { ...state.dragStart };
  // Use same scaling as placement velocity: factor 3 from delta world
  const velocity = {
    x: (state.dragCurrent.x - state.dragStart.x) * 3,
    y: (state.dragCurrent.y - state.dragStart.y) * 3,
  };
  return { position, velocity };
}

// Compute an orbit preview from current hold/drag state
export function getOrbitPreview() {
  if (!state.isHolding || !state.holdStart || !state.holdCurrent) return null;

  // Build array of all gravitating sources (alive only)
  const sources = [
    ...bh_list,
    ...stars,
    ...neutron_stars,
    ...white_dwarfs,
    ...gas_giants,
    ...planets,
    ...asteroids,
    ...comets,
  ].filter(b => b && b.alive !== false && b.pos && typeof b.mass === 'number');
  if (sources.length === 0) return null;

  // Initial position and velocity in world frame
  const pos = { x: state.holdStart.x, y: state.holdStart.y };
  let vel = {
    x: (state.holdCurrent.x - state.holdStart.x) * 3,
    y: (state.holdCurrent.y - state.holdStart.y) * 3,
  };

  // Integrate forward using symplectic Euler under many-body gravity
  const dt = 0.02; // sim seconds per step
  // Extend grey path length by 1.5x for a given insertion speed
  const steps = Math.floor(160 * 1.5);
  const gravityBoost =
    (typeof SETTINGS !== 'undefined' && SETTINGS.preview_gravity_boost) || 4.0;
  const points = [{ x: pos.x, y: pos.y }];
  let collisionInfo = null;
  for (let i = 0; i < steps; i++) {
    const a = gravitational_acceleration(pos, sources);
    // Exaggerate bending by boosting gravity for preview path only
    vel.x += a.ax * gravityBoost * dt;
    vel.y += a.ay * gravityBoost * dt;
    pos.x += vel.x * dt;
    pos.y += vel.y * dt;
    points.push({ x: pos.x, y: pos.y });

    // Predict collision with any source: stop early and mark collision
    if (!collisionInfo) {
      for (let sIdx = 0; sIdx < sources.length; sIdx++) {
        const s = sources[sIdx];
        if (!s || !s.pos || typeof s.radius !== 'number') continue;
        const dx = pos.x - s.pos.x;
        const dy = pos.y - s.pos.y;
        const distSq = dx * dx + dy * dy;
        // Use a reduced effective radius for black holes to avoid overly eager preview collisions
        const bhFactor =
          (typeof SETTINGS !== 'undefined' &&
            SETTINGS.preview_collision_bh_factor) ||
          0.6;
        const r =
          s.obj_type === 'BlackHole'
            ? Math.max(0, s.radius * bhFactor)
            : Math.max(0, s.radius);
        // Require inward radial motion for collision (reduces skim false positives)
        const radialDot = dx * vel.x + dy * vel.y; // < 0 means moving inward
        if (distSq <= r * r && radialDot < 0) {
          collisionInfo = {
            x: pos.x,
            y: pos.y,
            withId: s.id ?? null,
            withType: s.obj_type ?? null,
          };
          break;
        }
      }
      if (collisionInfo) break;
    }
  }

  // Attempt stable orbit detection around most massive body
  const primary = getMostMassiveBody(sources);
  if (primary && primary.pos && typeof primary.mass === 'number') {
    const last = points[points.length - 1];
    if (last) {
      // Relative initial state around primary (start of preview)
      const r0 = {
        x: points[0].x - primary.pos.x,
        y: points[0].y - primary.pos.y,
      };
      const v0 = {
        x: (state.holdCurrent.x - state.holdStart.x) * 3,
        y: (state.holdCurrent.y - state.holdStart.y) * 3,
      };
      // Specific energy sign test (using normal G, not boosted)
      const Gval =
        (typeof SETTINGS !== 'undefined' && SETTINGS.gravitational_constant) ||
        1.0;
      const rMag = Math.hypot(r0.x, r0.y);
      const vMag = Math.hypot(v0.x, v0.y);
      // Minimal drag/speed gate, but we will override this if direction-only condition is met
      const minSnapSpeed =
        (typeof SETTINGS !== 'undefined' && SETTINGS.snap_min_speed) || 2.0;
      // const E =
      //   0.5 * vMag * vMag - (Gval * primary.mass) / Math.max(rMag, 1e-9);

      // Sticky snapping: if velocity is roughly compatible with circular, snap
      // Compute ideal circular speed and allow both CCW and CW tangential directions
      const vCirc = Math.sqrt((Gval * primary.mass) / Math.max(rMag, 1e-9));
      const baseAngle = Math.atan2(r0.y, r0.x);
      const dirCCW = baseAngle + Math.PI / 2;
      const dirCW = baseAngle - Math.PI / 2;
      const vIdealCCW = {
        x: vCirc * Math.cos(dirCCW),
        y: vCirc * Math.sin(dirCCW),
      };
      const vIdealCW = {
        x: vCirc * Math.cos(dirCW),
        y: vCirc * Math.sin(dirCW),
      };
      // const dvx = v0.x - vIdeal.x;
      // const dvy = v0.y - vIdeal.y;
      // const velError = Math.hypot(dvx, dvy);
      // Dial down stickiness: require closer match to ideal
      // const baseTol =
      //   (typeof SETTINGS !== 'undefined' && SETTINGS.sticky_orbit_tolerance) ||
      //   5.0;
      // const speedScale = Math.max(1, vMag * 0.1);
      const denom = Math.max(1e-9, vMag * vCirc);
      const dotCCW = v0.x * vIdealCCW.x + v0.y * vIdealCCW.y;
      const cosCCW = Math.max(-1, Math.min(1, dotCCW / denom));
      const angErrCCW = Math.acos(cosCCW);
      const dotCW = v0.x * vIdealCW.x + v0.y * vIdealCW.y;
      const cosCW = Math.max(-1, Math.min(1, dotCW / denom));
      const angErrCW = Math.acos(cosCW);
      const angErr = Math.min(angErrCCW, angErrCW);
      // General angle tolerance removed in direction-only logic
      // Direction-only snap: if within this narrower angle, snap regardless of speed
      const dirOnlyDeg =
        (typeof SETTINGS !== 'undefined' &&
          SETTINGS.sticky_dir_only_angle_deg) ||
        15;
      const angleOkDirOnly = angErr <= (dirOnlyDeg * Math.PI) / 180;
      // Speed factor band removed in direction-only logic

      // If user hasn't dragged fast enough yet and not within direction-only band, show grey preview
      if (vMag < minSnapSpeed && !angleOkDirOnly) {
        return { points, snapped: false, collision: collisionInfo };
      }

      // Snap strictly by direction-only cone for seamless switching
      if (angleOkDirOnly) {
        const chosenIdeal = angErrCCW <= angErrCW ? vIdealCCW : vIdealCW;
        // Activate snap and store snapped velocity
        state.stickyOrbit.active = true;
        state.stickyOrbit.centralId = primary.id ?? null;
        state.stickyOrbit.snappedVel = { ...chosenIdeal };

        // Use snapped velocity only for the loop preview, keep live arrow responsive

        // Build a closed circular path (one full loop) for clear orbit outline
        const r = Math.max(1e-9, Math.hypot(r0.x, r0.y));
        const theta0 = Math.atan2(r0.y, r0.x);
        const samples = 240;
        const orbitPts = [];
        for (let i = 0; i <= samples; i++) {
          const t = i / samples;
          const theta = theta0 + 2 * Math.PI * t;
          orbitPts.push({
            x: primary.pos.x + r * Math.cos(theta),
            y: primary.pos.y + r * Math.sin(theta),
          });
        }

        // Prepend starting segment from current hold point back to the first orbit point
        // So the dashed path appears continuous from drop to orbit
        const fullPoints = [];
        // When snapped, show only the closed orbit (no connector)
        // Then the full orbit
        fullPoints.push(...orbitPts);

        return { points: fullPoints, snapped: true };
      }
    }
  }

  // If previously in sticky mode, require a large deviation and angle change to break snap
  if (state.stickyOrbit.active) {
    const central = [...sources].find(
      s => s.id === state.stickyOrbit.centralId
    );
    if (central) {
      const r0 = {
        x: state.holdStart.x - central.pos.x,
        y: state.holdStart.y - central.pos.y,
      };
      const Gval =
        (typeof SETTINGS !== 'undefined' && SETTINGS.gravitational_constant) ||
        1.0;
      const rMag = Math.hypot(r0.x, r0.y);
      const vCirc = Math.sqrt((Gval * central.mass) / Math.max(rMag, 1e-9));
      const baseAngle2 = Math.atan2(r0.y, r0.x);
      const dirCCW2 = baseAngle2 + Math.PI / 2;
      const dirCW2 = baseAngle2 - Math.PI / 2;
      const vIdealCCW2 = {
        x: vCirc * Math.cos(dirCCW2),
        y: vCirc * Math.sin(dirCCW2),
      };
      const vIdealCW2 = {
        x: vCirc * Math.cos(dirCW2),
        y: vCirc * Math.sin(dirCW2),
      };
      // Choose ideal direction that is closest to current drag direction
      const denom2 = Math.max(1e-9, Math.hypot(vel.x, vel.y) * vCirc);
      const cosCCW2 = Math.max(
        -1,
        Math.min(1, (vel.x * vIdealCCW2.x + vel.y * vIdealCCW2.y) / denom2)
      );
      const cosCW2 = Math.max(
        -1,
        Math.min(1, (vel.x * vIdealCW2.x + vel.y * vIdealCW2.y) / denom2)
      );
      const angErrCCW2 = Math.acos(cosCCW2);
      const angErrCW2 = Math.acos(cosCW2);
      const useCCW2 = angErrCCW2 <= angErrCW2;
      const vIdeal = useCCW2 ? vIdealCCW2 : vIdealCW2;
      // deviation thresholds no longer used in direction-only maintain logic
      const dot2 = vel.x * vIdeal.x + vel.y * vIdeal.y;
      const cosTheta2 = Math.max(-1, Math.min(1, dot2 / denom2));
      const angErr2 = Math.acos(cosTheta2);
      // const breakAngleDeg =
      //   (typeof SETTINGS !== 'undefined' && SETTINGS.sticky_break_angle_deg) ||
      //   20;
      // const breakAngle = (breakAngleDeg * Math.PI) / 180;
      // Maintain snap only while within the direction-only cone
      const dirOnlyDeg2 =
        (typeof SETTINGS !== 'undefined' &&
          SETTINGS.sticky_dir_only_angle_deg) ||
        15;
      if (angErr2 <= (dirOnlyDeg2 * Math.PI) / 180) {
        // Stay snapped: show a simple closed circular orbit in blue (one full loop)
        const r = Math.max(1e-9, Math.hypot(r0.x, r0.y));
        const theta0 = Math.atan2(r0.y, r0.x);
        const samples = 240;
        const orbitPts = [];
        for (let i = 0; i <= samples; i++) {
          const t = i / samples;
          const theta = theta0 + 2 * Math.PI * t;
          orbitPts.push({
            x: central.pos.x + r * Math.cos(theta),
            y: central.pos.y + r * Math.sin(theta),
          });
        }
        const fullPoints = [];
        // When snapped, show only the closed orbit (no connector)
        fullPoints.push(...orbitPts);
        return { points: fullPoints, snapped: true };
      }
    }
    // Break sticky if central not found or deviation too large
    state.stickyOrbit.active = false;
    state.stickyOrbit.centralId = null;
    state.stickyOrbit.snappedVel = null;
  }

  return { points, snapped: false, collision: collisionInfo };
}
