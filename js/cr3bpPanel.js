// =============================================================================
// The restricted three-body teaching mode
// -----------------------------------------------------------------------------
// Draws the zero-velocity boundary over the simulation, marks the five
// equilibria, and reports the tracer's Jacobi constant against the five
// critical values - so a student can see the forbidden region breathe as they
// change the tracer's speed, and watch the neck at L1 open.
//
// Three things it is careful about, and they are the same three the module it
// draws from is careful about.
//
// It states its conventions. The normalisation and the sign of C are on
// screen, not buried: C is larger for a SLOWER tracer, which is backwards from
// every other energy in the application and is the first thing a reader
// misreads.
//
// It distinguishes three claims that look alike. "Energetically accessible"
// means the energy does not forbid a point. "Will travel there" is a question
// for the integrator and this overlay cannot answer it. "Stable" is a third
// thing again, true of L4 and L5 below Routh's ratio and of nothing else here.
// The panel says all three separately and never lets one stand for another.
//
// It stops claiming when the claims stop being true. Every statement here is
// about the circular restricted problem, and a reader who adds a body, drags a
// star or lets the pair go eccentric is no longer looking at one. The overlay
// checks on every rebuild and disables itself with a reason rather than
// carrying on drawing a diagram of a system that is not on screen.
//
// Efficiency
// -----------------------------------------------------------------------------
// The expensive part is 2*Omega over a grid, and it depends only on mu and the
// patch of world in view - neither of which changes on a normal frame. It is
// computed once into a Float64Array and cached. The per-frame part is a
// threshold against the tracer's current C, which is one comparison per grid
// cell into a reused ImageData, drawn through a small offscreen canvas that
// the GPU scales up. Nothing here allocates per frame and nothing blocks.
// =============================================================================

import {
  planets,
  stars,
  gas_giants,
  bh_list,
  neutron_stars,
  white_dwarfs,
  asteroids,
  comets,
  world_to_screen,
  getPhysicsSetting,
} from './physics.js';
import { a0InSimUnits } from './mond.js';
import { orbitalElements } from './orbital.js';
import { SETTINGS, current_scenario_name } from './appState.js';
import { registerOverlay } from './overlays.js';
import { t, onLocaleChange } from './i18n/index.js';
import { ensureDeferredMessages } from './i18n/deferredMessages.js';
import { formatNumber } from './format.js';
import {
  LAGRANGE_NAMES,
  ROUTH_MU,
  assumptionsHold,
  jacobiConstant,
  lagrangePoints,
  massRatio,
  potentialField,
  regimeFor,
} from './cr3bp.js';

/** Grid resolution of the forbidden-region mask, in cells across. */
const GRID = 220;
/** How much of the pair's separation the overlay covers, either side. */
const SPAN = 1.8;

let root = null;
let enabled = false;
let unregister = null;
let cache = null;
let maskCanvas = null;
let maskImage = null;
let lastKey = '';

const esc = text =>
  String(text ?? '').replace(
    /[&<>"']/g,
    c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]
  );

const $ = id => root?.querySelector(`#${id}`);

/** Every body heavy enough to matter to the problem. */
const massiveBodies = () =>
  [
    ...bh_list,
    ...stars,
    ...neutron_stars,
    ...white_dwarfs,
    ...gas_giants,
  ].filter(b => b && b.alive !== false);

/** Everything light enough to be a tracer. */
const lightBodies = () =>
  [...planets, ...asteroids, ...comets].filter(b => b && b.alive !== false);

/**
 * The system as the restricted problem needs to see it.
 *
 * Returns null when there is nothing to describe. Everything downstream treats
 * a null as "say nothing" rather than as an error, because the ordinary state
 * of this overlay in most scenarios is having nothing to say.
 *
 * @returns {?object} The pair, the tracer, mu, the separation and the verdict
 */
/**
 * The force law the engine is actually applying to these bodies.
 *
 * What is ACTING, not what is selected. MOND is chosen by a setting and does
 * nothing whatever unless the scenario has declared a physical scale - the
 * same guard that keeps it out of the Solar System - and a halo with no
 * rotation speed is a halo of nothing, so neither of those is a reason to
 * refuse a configuration that is Newtonian in every respect that matters. The
 * softening floor is likewise not a modification until something comes inside
 * it, so the closest distance in play is measured and handed over with it.
 *
 * @param {Array<object>} massive - The two heavy bodies
 * @param {?object} tracer - The light third body
 * @returns {object} {extraPotential, softening, minDistance}
 */
function activeForceLaw(massive, tracer) {
  const mode = getPhysicsSetting('galaxy_gravity');
  let extraPotential = null;
  if (mode === 'halo' && Number(getPhysicsSetting('halo_v_flat')) > 0) {
    extraPotential = 'halo';
  } else if (mode === 'mond') {
    const a0 = a0InSimUnits(
      {
        kpcPerUnit: getPhysicsSetting('galaxy_kpc_per_unit'),
        solarMassPerUnit: getPhysicsSetting('galaxy_msun_per_unit'),
      },
      getPhysicsSetting('gravitational_constant')
    );
    if (Number.isFinite(a0) && a0 > 0) extraPotential = 'mond';
  }

  // Every distance the model depends on: the pair's separation, and the
  // tracer's distance to each of them. Any one of these inside the floor means
  // the force being integrated there is not the inverse square drawn here.
  const gap = (a, b) =>
    a && b ? Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y) : Infinity;
  const distances = [];
  if (massive.length === 2) distances.push(gap(massive[0], massive[1]));
  if (tracer) for (const m of massive) distances.push(gap(tracer, m));
  const finite = distances.filter(d => Number.isFinite(d));

  return {
    extraPotential,
    softening: Number(getPhysicsSetting('min_interaction_distance')) || 0,
    minDistance: finite.length ? Math.min(...finite) : Infinity,
  };
}

export function readSystem() {
  const massive = massiveBodies();
  const light = lightBodies();
  const tracer = light[0] ?? null;

  let eccentricity = null;
  let bound = true;
  if (massive.length === 2) {
    const el = orbitalElements(
      massive[1],
      massive[0],
      SETTINGS.gravitational_constant
    );
    // Null rather than zero when the elements could not be found: an
    // eccentricity nobody computed is not a circular orbit, and
    // assumptionsHold() now refuses it rather than passing it through.
    eccentricity = el && Number.isFinite(el.e) ? el.e : null;
    bound = el ? el.bound !== false : false;
  }

  // Everything that is neither the pair nor the tracer, so their combined pull
  // is judged rather than assumed away one body at a time.
  const others = light.filter(b => b !== tracer);
  const verdict = assumptionsHold({
    massive,
    tracer,
    eccentricity,
    others,
    bound,
    forceLaw: activeForceLaw(massive, tracer),
  });
  if (massive.length !== 2) return { verdict, mu: null, tracer, eccentricity };

  // Heavier body first, so the frame matches the convention in js/cr3bp.js:
  // primary at -mu, secondary at 1-mu.
  const [primary, secondary] =
    massive[0].mass >= massive[1].mass ? massive : [massive[1], massive[0]];
  const mu = massRatio(primary.mass, secondary.mass);
  const sx = secondary.pos.x - primary.pos.x;
  const sy = secondary.pos.y - primary.pos.y;
  const separation = Math.hypot(sx, sy);

  return {
    verdict,
    mu,
    primary,
    secondary,
    tracer,
    eccentricity,
    separation,
    // The barycentre, which is the origin of the rotating frame.
    origin: {
      x:
        (primary.mass * primary.pos.x + secondary.mass * secondary.pos.x) /
        (primary.mass + secondary.mass),
      y:
        (primary.mass * primary.pos.y + secondary.mass * secondary.pos.y) /
        (primary.mass + secondary.mass),
    },
    // The pair's orientation, so world coordinates can be rotated into the
    // frame the problem is posed in.
    cos: separation > 0 ? sx / separation : 1,
    sin: separation > 0 ? sy / separation : 0,
    // Which way the pair goes round.
    //
    // The frame was assumed to rotate counter-clockwise. A pair orbiting the
    // other way has angular velocity -n, so every frame-rotation term had the
    // wrong sign and the Jacobi constant, the Lagrange points and the
    // zero-velocity curves came out mirrored - a confident, wrong picture with
    // nothing on screen to suggest it.
    //
    // Both directions are supported rather than one declined, because the
    // restricted problem is invariant under reflecting y and vy together with
    // reversing the rotation: a clockwise system maps exactly onto the
    // counter-clockwise convention. `spin` carries the sign so tracerState()
    // can apply that reflection and the overlay can draw it the right way up.
    spin: pairSpin(primary, secondary),
  };
}

/**
 * The sign of the pair's orbital angular momentum about their barycentre.
 *
 * +1 counter-clockwise, -1 clockwise. Zero angular momentum means a radial
 * plunge with no rotating frame to speak of; +1 is returned so nothing divides
 * by it, and the eccentricity check refuses that system anyway.
 *
 * @param {object} primary - Heavier body
 * @param {object} secondary - Lighter body
 * @returns {number} +1 or -1
 */
function pairSpin(primary, secondary) {
  const rx = secondary.pos.x - primary.pos.x;
  const ry = secondary.pos.y - primary.pos.y;
  const vx = secondary.vel.x - primary.vel.x;
  const vy = secondary.vel.y - primary.vel.y;
  const h = rx * vy - ry * vx;
  return h < 0 ? -1 : 1;
}

/**
 * The tracer's state in the rotating frame, normalised.
 *
 * @param {object} system - From readSystem
 * @returns {?{x: number, y: number, vx: number, vy: number}} The state
 */
export function tracerState(system) {
  if (!system?.tracer || !(system.separation > 0)) return null;
  const { tracer, origin, cos, sin, separation } = system;

  const dx = (tracer.pos.x - origin.x) / separation;
  const dy = (tracer.pos.y - origin.y) / separation;
  const x = dx * cos + dy * sin;
  const y = -dx * sin + dy * cos;

  // The mean motion, which is 1 in these units by construction - so a velocity
  // is normalised by separation * n, and the rotating-frame velocity is the
  // inertial one minus the frame's own motion at that point.
  const mu = system.mu;
  const n = Math.sqrt(
    (SETTINGS.gravitational_constant *
      (system.primary.mass + system.secondary.mass)) /
      separation ** 3
  );
  const bvx =
    (system.primary.mass * system.primary.vel.x +
      system.secondary.mass * system.secondary.vel.x) /
    (system.primary.mass + system.secondary.mass);
  const bvy =
    (system.primary.mass * system.primary.vel.y +
      system.secondary.mass * system.secondary.vel.y) /
    (system.primary.mass + system.secondary.mass);
  const wx = (tracer.vel.x - bvx) / (separation * n);
  const wy = (tracer.vel.y - bvy) / (separation * n);
  const rx = wx * cos + wy * sin;
  const ry = -wx * sin + wy * cos;

  // Reflect a clockwise system onto the counter-clockwise convention. The
  // restricted problem is invariant under (y, vy) -> (-y, -vy) together with
  // reversing the direction of rotation, so this is an exact mapping and not
  // an approximation: the Jacobi constant and the zero-velocity curves that
  // come out of it are the system's own, drawn in a mirrored frame.
  const spin = system.spin ?? 1;
  const fy = y * spin;
  const fry = ry * spin;

  return { x, y: fy, vx: rx + fy, vy: fry - x, mu, spin };
}

/**
 * The inertial velocity that would put the tracer at a given rotating-frame one.
 *
 * The exact inverse of tracerState()'s velocity half, and it exists because
 * there is no other honest way to ask "what happens when this tracer moves
 * faster in the rotating frame". Adding a fixed vector to the INERTIAL
 * velocity does not do it: the rotating-frame velocity is the inertial one
 * minus the frame's own motion at that point, so a fixed increment adds to the
 * rotating-frame velocity too - and adds to it vectorially. Where the tracer
 * already has rotating-frame motion pointing the other way, that increment
 * makes it SLOWER, and the Jacobi constant correctly goes up.
 *
 * e2e/cr3bp.spec.js used to do exactly that and call the result "at rest in
 * the rotating frame". It passed whenever the sample happened early enough
 * that the existing rotating-frame speed was small, and failed on a loaded
 * runner one frame later, with the physics right and the fixture wrong.
 *
 * @param {object} system - From readSystem()
 * @param {{vx: number, vy: number}} rotating - Wanted rotating-frame velocity,
 *   in the normalised units tracerState() reports
 * @returns {?{x: number, y: number}} The world velocity to assign
 */
export function inertialVelocityFor(system, rotating) {
  const state = tracerState(system);
  if (!state) return null;
  const { cos, sin, separation } = system;
  const spin = system.spin ?? 1;

  const n = Math.sqrt(
    (SETTINGS.gravitational_constant *
      (system.primary.mass + system.secondary.mass)) /
      separation ** 3
  );

  // Undo the frame terms, then the reflection, then the rotation - each the
  // inverse of the step tracerState() applies, in reverse order.
  const rx = Number(rotating.vx) - state.y;
  const fry = Number(rotating.vy) + state.x;
  const ry = fry * spin;
  const wx = rx * cos - ry * sin;
  const wy = rx * sin + ry * cos;

  const total = system.primary.mass + system.secondary.mass;
  const bvx =
    (system.primary.mass * system.primary.vel.x +
      system.secondary.mass * system.secondary.vel.x) /
    total;
  const bvy =
    (system.primary.mass * system.primary.vel.y +
      system.secondary.mass * system.secondary.vel.y) /
    total;

  return {
    x: bvx + wx * separation * n,
    y: bvy + wy * separation * n,
  };
}

/** Turn on or off. @param {boolean} on - Whether to show it @returns {void} */
export function setCr3bpEnabled(on) {
  enabled = Boolean(on);
  if (root) root.hidden = !enabled;
  if (enabled && !unregister) unregister = registerOverlay(drawOverlay);
  if (!enabled && unregister) {
    unregister();
    unregister = null;
  }
  render();
}

/** @returns {boolean} Whether the teaching mode is on */
export const isCr3bpEnabled = () => enabled;

/** Build the panel once. */
function mount() {
  if (root) return;
  root = document.createElement('div');
  root.id = 'cr3bpContainer';
  root.className = 'obs-panel cr3bp-panel';
  root.setAttribute('role', 'region');
  root.setAttribute('aria-labelledby', 'cr3bpTitle');
  root.hidden = true;
  root.innerHTML = `
    <div class="obs-panel-toolbar">
      <div class="obs-panel-meta">
        <span class="obs-panel-title" id="cr3bpTitle">${esc(t('cr3bp.title'))}</span>
      </div>
      <div class="obs-panel-actions">
        <button id="cr3bpClose" class="obs-panel-btn" title="${esc(t('cr3bp.close'))}">✕</button>
      </div>
    </div>
    <div class="cr3bp-body">
      <p id="cr3bpValidity" class="cr3bp-validity"></p>
      <div id="cr3bpReadout"></div>
      <p class="cr3bp-convention">${esc(t('cr3bp.convention'))}</p>
      <details class="cr3bp-claims">
        <summary>${esc(t('cr3bp.claims.title'))}</summary>
        <p class="experiment-hint">${esc(t('cr3bp.claims.accessible'))}</p>
        <p class="experiment-hint">${esc(t('cr3bp.claims.reachable'))}</p>
        <p class="experiment-hint">${esc(t('cr3bp.claims.stable'))}</p>
      </details>
    </div>`;
  document.body.appendChild(root);
  $('cr3bpClose').onclick = () => setCr3bpEnabled(false);
  onLocaleChange(() => render());
}

/** Redraw the readout. */
function render() {
  if (!root) return;
  root.hidden = !enabled;
  if (!enabled) return;

  const system = readSystem();
  const validity = $('cr3bpValidity');
  const out = $('cr3bpReadout');
  out.innerHTML = '';

  if (!system?.verdict.ok) {
    // The claims are switched off rather than qualified into meaninglessness.
    // Every reason is named, because "this does not apply" without a why is
    // indistinguishable from a broken panel.
    const reasons = (system?.verdict.violations || []).map(v =>
      t(`cr3bp.invalid.${v}`)
    );
    validity.dataset.state = 'invalid';
    validity.textContent = `${t('cr3bp.invalid.title')} ${reasons.join(' ')}`;
    return;
  }

  validity.dataset.state = 'ok';
  validity.textContent = t('cr3bp.valid', {
    mu: formatNumber(system.mu, { sig: 5 }),
  });

  const state = tracerState(system);
  const C = state ? jacobiConstant(state, system.mu) : null;
  const regime = C === null ? null : regimeFor(C, system.mu);
  const points = lagrangePoints(system.mu) || [];

  const line = (text, cls = 'experiment-note') => {
    const el = document.createElement('p');
    el.className = cls;
    el.textContent = text;
    out.appendChild(el);
  };

  if (C === null) {
    line(t('cr3bp.noTracer'));
  } else {
    line(t('cr3bp.jacobi', { C: formatNumber(C, { sig: 6 }) }), 'cr3bp-jacobi');
    line(t(`cr3bp.regime.${regime.regime}`));
    // The distance to the next gate, which is the number that says whether a
    // small change to the tracer would open one.
    if (!regime.l1Open) {
      line(
        t('cr3bp.toGate', {
          gate: 'L1',
          d: formatNumber(Math.abs(regime.toL1), { sig: 3 }),
        }),
        'experiment-hint'
      );
    } else if (!regime.l2Open) {
      line(
        t('cr3bp.toGate', {
          gate: 'L2',
          d: formatNumber(Math.abs(regime.toL2), { sig: 3 }),
        }),
        'experiment-hint'
      );
    }
  }

  const table = document.createElement('table');
  table.className = 'experiment-table';
  const head = document.createElement('tr');
  for (const label of [t('cr3bp.point'), 'x', 'C', t('cr3bp.reachableHere')]) {
    const th = document.createElement('th');
    th.textContent = label;
    head.appendChild(th);
  }
  table.appendChild(head);
  for (const p of points) {
    const tr = document.createElement('tr');
    const cells = [
      p.name + (p.linearlyStable ? ` ${t('cr3bp.stableMark')}` : ''),
      formatNumber(p.x, { sig: 5 }),
      formatNumber(p.C, { sig: 6 }),
      C === null ? '—' : C <= p.C ? t('cr3bp.yes') : t('cr3bp.no'),
    ];
    cells.forEach((text, i) => {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      cell.textContent = text;
      tr.appendChild(cell);
    });
    table.appendChild(tr);
  }
  out.appendChild(table);
  line(
    system.mu < ROUTH_MU
      ? t('cr3bp.routh.below', { mu: formatNumber(ROUTH_MU, { sig: 4 }) })
      : t('cr3bp.routh.above', { mu: formatNumber(ROUTH_MU, { sig: 4 }) }),
    'experiment-hint'
  );
}

/**
 * Draw the forbidden region and the equilibria over the simulation.
 *
 * @param {CanvasRenderingContext2D} ctx - The simulation canvas
 * @returns {void}
 */
function drawOverlay(ctx) {
  if (!enabled) return;
  const system = readSystem();
  if (!system?.verdict.ok || !(system.separation > 0)) return;
  const state = tracerState(system);
  const C = state ? jacobiConstant(state, system.mu) : null;

  ensureField(system.mu);
  if (cache && C !== null) paintForbidden(ctx, system, C);
  paintPoints(ctx, system, C);
}

/**
 * Compute the potential grid, once per mass parameter.
 *
 * The whole efficiency story is in this function not running. 2*Omega over
 * 220x220 cells is fifty thousand square roots; it depends on mu and nothing
 * else, because the grid is in the rotating frame's own normalised
 * coordinates, so a moving camera and a moving tracer both leave it valid.
 *
 * @param {number} mu - Mass parameter
 * @returns {void}
 */
function ensureField(mu) {
  const key = `${mu}`;
  if (cache && lastKey === key) return;
  cache = potentialField({
    mu,
    bounds: { minX: -SPAN, maxX: SPAN, minY: -SPAN, maxY: SPAN },
    width: GRID,
    height: GRID,
  });
  lastKey = key;
  if (!maskCanvas) {
    maskCanvas = document.createElement('canvas');
    maskCanvas.width = GRID;
    maskCanvas.height = GRID;
  }
  maskImage = maskCanvas.getContext('2d').createImageData(GRID, GRID);
}

/** Threshold the cached field at the tracer's C and blit it. */
function paintForbidden(ctx, system, C) {
  const { field } = cache;
  const data = maskImage.data;
  // One comparison per cell into a buffer that is reused every frame. No
  // allocation here, which is what keeps this off the frame budget.
  for (let i = 0; i < field.length; i++) {
    const forbidden = field[i] < C;
    const o = i * 4;
    data[o] = 90;
    data[o + 1] = 20;
    data[o + 2] = 40;
    data[o + 3] = forbidden ? 150 : 0;
  }
  const mctx = maskCanvas.getContext('2d');
  mctx.putImageData(maskImage, 0, 0);

  // The grid is in rotating-frame units, so it is placed by transforming the
  // canvas rather than by recomputing the field in world coordinates.
  const { origin, separation, cos, sin } = system;
  const o = world_to_screen(origin);
  const edge = world_to_screen({
    x: origin.x + separation * cos,
    y: origin.y + separation * sin,
  });
  const scale = Math.hypot(edge.x - o.x, edge.y - o.y);
  if (!(scale > 0)) return;
  const angle = Math.atan2(edge.y - o.y, edge.x - o.x);

  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(
    maskCanvas,
    -SPAN * scale,
    -SPAN * scale,
    2 * SPAN * scale,
    2 * SPAN * scale
  );
  ctx.restore();
}

/** Mark the five equilibria. */
/**
 * The Lagrange points in world coordinates, in the order cr3bp.js returns them.
 *
 * Exported because the transform is the part that can be wrong: everything
 * js/cr3bp.js computes is in the counter-clockwise convention, a clockwise
 * pair is mapped onto it by flipping y, and a caller that rotates those points
 * back into the world without undoing the flip draws L4 where L5 is. That is
 * checkable against the physics - L4 leads the secondary in the direction of
 * motion, whichever way the pair goes round - and now it is checked.
 *
 * @param {object} system - From readSystem()
 * @returns {?Array<object>} Each point with x and y in world coordinates
 */
export function lagrangePointsInWorld(system) {
  const points = lagrangePoints(system?.mu);
  if (!points || !system) return null;
  const { origin, separation, cos, sin } = system;
  const spin = system.spin ?? 1;
  return points.map(p => {
    const py = p.y * spin;
    return {
      ...p,
      x: origin.x + separation * (p.x * cos - py * sin),
      y: origin.y + separation * (p.x * sin + py * cos),
    };
  });
}

function paintPoints(ctx, system, C) {
  const points = lagrangePointsInWorld(system);
  if (!points) return;
  ctx.save();
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const p of points) {
    const s = world_to_screen({ x: p.x, y: p.y });

    // Filled when the tracer's energy permits it to be there, hollow when it
    // does not. Deliberately not "reachable" - the fill says the energy does
    // not forbid the point, which is a much smaller claim.
    const open = C !== null && C <= p.C;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
    ctx.strokeStyle = p.linearlyStable ? '#7fe3a0' : '#ffd27f';
    ctx.lineWidth = 1.5;
    if (open) {
      ctx.fillStyle = p.linearlyStable ? '#7fe3a0' : '#ffd27f';
      ctx.fill();
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(p.name, s.x, s.y - 12);
  }
  ctx.restore();
}

/** Wire the panel up. Called once, when the chunk arrives. @returns {void} */
export function initCr3bp() {
  // This panel's strings are not in the start-up catalogue, so it registers
  // them itself rather than trusting whoever opened it to have done so. The
  // bridge does register them first in the normal path; a lesson, a share link
  // or a test that drives the panel directly does not, and a panel that renders
  // message ids because of who called it is a panel with a bug.
  ensureDeferredMessages()
    .then(() => render())
    .catch(() => {});

  mount();
  window.addEventListener('gravitasSimulationReset', () => {
    // A rebuilt world is a different mu and possibly a different problem. The
    // cached field is discarded and the validity re-tested, which is what
    // stops the overlay describing a system that is no longer on screen.
    cache = null;
    lastKey = '';
    render();
  });
}

/**
 * Show the panel when its scenario loads.
 *
 * The reset that triggered the import has already fired, so the first
 * appearance has to be asked for directly.
 *
 * @returns {void}
 */
export function notifyScenarioReady() {
  if (current_scenario_name === 'Lagrange Point Lab') setCr3bpEnabled(true);
}

/** Redraw the readout, for callers driving the panel. @returns {void} */
export const refreshCr3bp = () => render();

/** @returns {?object} What the panel is currently reporting, for tests */
export function cr3bpReadout() {
  const system = readSystem();
  if (!system?.verdict.ok) {
    return { ok: false, violations: system?.verdict.violations ?? [] };
  }
  const state = tracerState(system);
  const C = state ? jacobiConstant(state, system.mu) : null;
  return {
    ok: true,
    mu: system.mu,
    eccentricity: system.eccentricity,
    state,
    C,
    regime: C === null ? null : regimeFor(C, system.mu),
    points: lagrangePoints(system.mu),
    names: LAGRANGE_NAMES,
  };
}
