// =============================================================================
// The rotation curve panel
// -----------------------------------------------------------------------------
// Speed against radius, one point per body, drawn live against two predictions:
// what the visible mass alone would produce, and what the visible mass plus the
// dark-matter halo would produce.
//
// This is the single plot the whole dark-matter case rests on, so it is worth
// being clear about what is measured and what is calculated.
//
//   The points are measured. Each one is a body's actual distance from the
//   center of mass and its actual speed about it, taken from the simulation
//   this frame. Nothing is fitted, smoothed or assumed.
//
//   The falling line is calculated. It is sqrt(G M(<r) / r) using only the mass
//   of the objects in the scene: the prediction you would make if the light
//   told you where all the mass was.
//
//   The flat line is calculated too, and only appears when the halo is on.
//
// A student switches the halo on and watches the points leave one line and land
// on the other. The plot never asserts which is right; the bodies do.
//
// The panel draws on a raw canvas rather than through Chart.js. It needs a log
// x-axis, a scatter, two model curves and a fitted slope annotation on top of
// each other, and every one of those is a line of canvas code and a fight with
// a chart library's option object.
// =============================================================================

import {
  stars,
  planets,
  gas_giants,
  asteroids,
  bh_list,
  neutron_stars,
  white_dwarfs,
  galaxies,
  getPhysicsSetting,
  updatePhysicsSettings,
} from './physics.js';
import {
  massCenter,
  rotationCurvePoints,
  keplerianSpeed,
  haloCircularSpeed,
  fitPowerLaw,
  enclosedVisibleMass,
  velocityDispersion,
} from './darkMatter.js';
import { chartColors } from './observationChart.js';
import { formatNumber } from './format.js';
import { solarHTML } from './utils.js';
import { formatSpeed, formatDistance, SIM_UNITS_PER_AU } from './units.js';
import {
  layoutObservationPanels,
  noteObservationPanelUsed,
} from './observationLayout.js';

let enabled = false;
let els = null;

// The last fit, kept so the readout does not flicker between frames when a
// body briefly leaves the fitting window.
let lastFit = null;

/** @returns {object} Cached element references */
function cacheElements() {
  if (els) return els;
  els = {
    container: document.getElementById('rotationCurveContainer'),
    canvas: document.getElementById('rotationCurveCanvas'),
    status: document.getElementById('rotationCurveStatus'),
    slope: document.getElementById('rotationCurveSlope'),
    verdict: document.getElementById('rotationCurveVerdict'),
    visible: document.getElementById('rotationCurveVisible'),
    haloBtn: document.getElementById('rotationCurveHalo'),
    haloState: document.getElementById('rotationCurveHaloState'),
    vFlat: document.getElementById('rotationCurveVFlat'),
    vFlatValue: document.getElementById('rotationCurveVFlatValue'),
    core: document.getElementById('rotationCurveCore'),
    coreValue: document.getElementById('rotationCurveCoreValue'),
    close: document.getElementById('rotationCurveClose'),
    toggle: document.getElementById('toggleRotationCurve'),
    notice: document.getElementById('rotationCurveNotice'),
    cluster: document.getElementById('rotationCurveCluster'),
    members: document.getElementById('rotationCurveMembers'),
    sigma: document.getElementById('rotationCurveSigma'),
    radius: document.getElementById('rotationCurveRadius'),
  };
  return els;
}

/**
 * Every body whose motion counts as part of the rotation curve.
 *
 * Debris and accretion-disk particles are left out. They are numerous, mostly
 * unbound, and they would bury the signal in a cloud of points that describe
 * fragments rather than orbits.
 *
 * @returns {Array} Bodies
 */
export function curveBodies() {
  return [
    ...stars,
    ...planets,
    ...gas_giants,
    ...asteroids,
    ...neutron_stars,
    ...white_dwarfs,
    ...bh_list,
    ...galaxies,
  ].filter(b => b && b.alive !== false && isFinite(b.mass) && b.mass > 0);
}

/** @returns {?{vFlat: number, coreRadius: number}} Halo parameters, or null */
function halo() {
  return getPhysicsSetting('dark_matter_halo')
    ? {
        vFlat: getPhysicsSetting('halo_v_flat'),
        coreRadius: getPhysicsSetting('halo_core_radius'),
      }
    : null;
}

/**
 * The current state of the plot: points, center, fit, and the two predictions.
 *
 * Separated from the drawing so the numbers can be read without a canvas, which
 * is what the tests and the investigation's own checks use.
 *
 * @returns {object} Everything the panel knows this frame
 */
export function rotationCurveState() {
  const bodies = curveBodies();
  const center = massCenter(bodies);
  const all = rotationCurvePoints(bodies, center);
  const G = getPhysicsSetting('gravitational_constant');

  // Drop the central mass, and only the central mass. A rotation curve plots
  // tracers moving in a field; the body making the field is not a tracer of
  // itself, and a real rotation curve never carries a point for the bulge.
  // Leaving it in put a body at r = 6 with the model predicting 49 there, which
  // set the vertical scale from a point that means nothing and squashed the
  // whole disc into the bottom eighth of the plot.
  //
  // Identified as the heaviest body sitting near the middle, rather than by a
  // radius cutoff: a cutoff wide enough to catch a galactic bulge also threw
  // away Mercury, which is a tracer and belongs on the plot.
  const outermost = all.length ? all[all.length - 1].r : 0;
  let heaviest = null;
  for (const p of all) if (!heaviest || p.mass > heaviest.mass) heaviest = p;
  const central =
    heaviest && heaviest.r < outermost * 0.05 ? heaviest.body : null;
  const points = central ? all.filter(p => p.body !== central) : all;

  // Fit only the outer part. Inside the bulge the curve rises with radius for
  // reasons that have nothing to do with dark matter, and including that region
  // would drag a genuinely Keplerian slope toward zero and manufacture the
  // result the lesson is asking students to test for.
  const rMax = points.length ? points[points.length - 1].r : 0;
  const rFitMin = rMax * 0.25;
  const fit = fitPowerLaw(points, rFitMin);
  if (fit) lastFit = fit;

  return {
    bodies,
    center,
    points,
    G,
    halo: halo(),
    rFitMin,
    fit: fit || lastFit,
    visibleMass: center.mass,
    enclosedAtEdge: enclosedVisibleMass(bodies, center, rMax),
  };
}

/**
 * What a cluster of galaxies offers to be measured.
 *
 * A cluster is a swarm, not a disc, so a rotation curve is the wrong
 * instrument for it: its members are on randomly oriented orbits and there is
 * no rotation to plot. What there is instead is a velocity dispersion and a
 * size, and those two numbers plus the virial theorem are the whole of
 * Zwicky's 1933 measurement.
 *
 * The panel reports the measurements and stops there. It does not do the
 * virial arithmetic, because doing that arithmetic is the exercise.
 *
 * @returns {?object} Cluster measurements, or null when there is no cluster
 */
export function clusterState() {
  const members = galaxies.filter(g => g && g.alive !== false);
  if (members.length < 3) return null;

  const center = massCenter(members);
  const { sigma, meanSquare } = velocityDispersion(members);

  let radius = 0;
  for (const g of members) {
    radius = Math.max(
      radius,
      Math.hypot(g.pos.x - center.x, g.pos.y - center.y)
    );
  }

  return {
    count: members.length,
    sigma,
    meanSquare,
    radius,
    visibleMass: center.mass,
  };
}

/**
 * Say in words what the fitted slope means.
 *
 * The exponent alone is a number; the point of the lesson is what it implies
 * about where the mass is. Bands are wide because a live simulation with a
 * handful of bodies is noisy and a verdict that flickered between two readings
 * every frame would be worse than no verdict.
 *
 * @param {?number} exponent - Fitted power-law exponent
 * @returns {{label: string, detail: string}} A short verdict and its reason
 */
export function describeSlope(exponent) {
  if (exponent === null || exponent === undefined || !isFinite(exponent)) {
    return { label: '—', detail: 'Not enough bodies to fit a slope.' };
  }
  if (exponent < -0.38) {
    return {
      label: 'Keplerian',
      detail:
        'Speed falls as roughly the inverse square root of radius. The mass is concentrated in the middle, and there is nothing much further out.',
    };
  }
  if (exponent < -0.15) {
    return {
      label: 'Falling',
      detail:
        'Speed drops with radius, but more slowly than a central point mass alone would give.',
    };
  }
  if (exponent < 0.15) {
    return {
      label: 'Flat',
      detail:
        'Speed barely changes with radius. Something out there is still adding mass as you go further out.',
    };
  }
  return {
    label: 'Rising',
    detail:
      'Speed increases with radius. Mass is still being enclosed faster than the radius grows.',
  };
}

/**
 * Draw the plot.
 *
 * Log radius across, linear speed up. Log because a galaxy scenario spans two
 * decades of radius and a linear axis would pile every inner body into the
 * left-hand pixel; and because a power law is a straight line in log-log, which
 * is what makes "falling as r to the minus a half" something you can see rather
 * than something you have to be told.
 *
 * @param {object} snap - State from rotationCurveState
 */
function draw(snap) {
  const e = cacheElements();
  const canvas = e.canvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 320;
  const h = canvas.clientHeight || 190;
  if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
  if (canvas.height !== Math.round(h * dpr)) {
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const t = chartColors();
  const padL = 44;
  const padR = 10;
  const padT = 10;
  const padB = 26;
  const plotW = Math.max(10, w - padL - padR);
  const plotH = Math.max(10, h - padT - padB);

  const pts = snap.points;
  if (!pts.length) {
    ctx.fillStyle = t.label;
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No orbiting bodies to plot', w / 2, h / 2);
    return;
  }

  const rMin = Math.max(pts[0].r * 0.7, 1e-3);
  const rMax = pts[pts.length - 1].r * 1.3;
  const logMin = Math.log10(rMin);
  const logMax = Math.log10(Math.max(rMax, rMin * 1.5));

  const samples = 96;
  const modelAt = r => {
    const vb = keplerianSpeed(snap.bodies, snap.center, r, snap.G);
    if (!snap.halo) return { vb, vt: vb };
    const vh = haloCircularSpeed(r, snap.halo.vFlat, snap.halo.coreRadius);
    return { vb, vt: Math.hypot(vb, vh) };
  };

  // The vertical scale comes from the measured points and from the model over
  // the outer half of the range. Both model curves climb without limit toward
  // r = 0, so scaling to include all of them would compress the part being
  // compared into a sliver. The inner ends run off the top instead, clipped to
  // the plot, which is what a reader expects a curve leaving the frame to do.
  let vMax = 0;
  for (const p of pts) vMax = Math.max(vMax, p.speed);
  for (let i = Math.floor(samples / 2); i <= samples; i++) {
    const r = Math.pow(10, logMin + ((logMax - logMin) * i) / samples);
    const m = modelAt(r);
    vMax = Math.max(vMax, m.vb, m.vt);
  }
  vMax = vMax > 0 ? vMax * 1.15 : 1;

  const X = r => padL + ((Math.log10(r) - logMin) / (logMax - logMin)) * plotW;
  const Y = v => padT + plotH - (v / vMax) * plotH;

  // Grid: one vertical line per decade of radius.
  ctx.strokeStyle = t.grid;
  ctx.lineWidth = 1;
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillStyle = t.tick;
  ctx.textAlign = 'center';
  for (let d = Math.ceil(logMin); d <= Math.floor(logMax); d++) {
    const x = X(Math.pow(10, d));
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + plotH);
    ctx.stroke();
    const au = Math.pow(10, d) / SIM_UNITS_PER_AU;
    ctx.fillText(
      au >= 1 ? `${formatNumber(au, 2)} AU` : `${formatNumber(au, 2)}`,
      x,
      padT + plotH + 14
    );
  }

  // Axes.
  ctx.strokeStyle = t.grid;
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, padT + plotH);
  ctx.lineTo(padL + plotW, padT + plotH);
  ctx.stroke();

  ctx.textAlign = 'right';
  for (const frac of [0, 0.5, 1]) {
    const v = vMax * frac;
    const y = Y(v);
    ctx.fillStyle = t.tick;
    ctx.fillText(formatNumber(v, 2), padL - 5, y + 3);
  }

  // The visible-mass prediction: a solid line, because it is the hypothesis
  // being tested rather than a decoration.
  const drawModel = (pick, color, dash) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, padT, plotW, plotH);
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.75;
    ctx.setLineDash(dash);
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= samples; i++) {
      const r = Math.pow(10, logMin + ((logMax - logMin) * i) / samples);
      const v = pick(modelAt(r));
      if (!isFinite(v)) continue;
      const x = X(r);
      const y = Y(v);
      if (started) ctx.lineTo(x, y);
      else {
        ctx.moveTo(x, y);
        started = true;
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  };

  drawModel(m => m.vb, t.warm, [5, 4]);
  if (snap.halo) drawModel(m => m.vt, t.cool, []);

  // The measured bodies. Larger dots for more massive bodies, so a reader can
  // tell the central mass from the tracers without a legend entry for each.
  for (const p of pts) {
    const rad = p.mass >= 500 ? 4 : p.mass >= 50 ? 3 : 2.2;
    ctx.beginPath();
    ctx.arc(X(p.r), Y(p.speed), rad, 0, Math.PI * 2);
    ctx.fillStyle = t.accent;
    ctx.fill();
  }

  // Shade the region excluded from the fit, so the reported slope is visibly
  // the slope of the outer curve and not of everything.
  if (snap.rFitMin > rMin) {
    ctx.fillStyle = t.grid;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(padL, padT, Math.max(0, X(snap.rFitMin) - padL), plotH);
    ctx.globalAlpha = 1;
  }
}

/** Refresh the numbers beside the plot. @param {object} snap - Current state */
function renderReadout(snap) {
  const e = cacheElements();
  const exponent = snap.fit ? snap.fit.exponent : null;
  const verdict = describeSlope(exponent);

  if (e.status) {
    e.status.textContent = `${snap.points.length} bodies`;
  }
  if (e.slope) {
    e.slope.textContent =
      exponent === null ? '—' : `v ∝ r${formatExponent(exponent)}`;
  }
  if (e.verdict) {
    e.verdict.textContent = verdict.label;
    e.verdict.title = verdict.detail;
  }
  if (e.visible) {
    // Unit inside the value, not in a span of its own beside it: as a separate
    // element it wrapped onto its own line and read as an empty third row.
    e.visible.innerHTML = solarHTML(formatNumber(snap.visibleMass / 1000, 3));
  }
  if (e.haloState) {
    e.haloState.textContent = snap.halo ? 'On' : 'Off';
  }
  if (e.haloBtn) {
    e.haloBtn.setAttribute('data-state', snap.halo ? 'on' : 'off');
    e.haloBtn.setAttribute('aria-checked', snap.halo ? 'true' : 'false');
  }
  if (e.vFlatValue) {
    e.vFlatValue.textContent = formatSpeed(getPhysicsSetting('halo_v_flat'));
  }
  if (e.coreValue) {
    e.coreValue.textContent = formatDistance(
      getPhysicsSetting('halo_core_radius')
    );
  }
  // A cluster gets its own three numbers, and only when there is a cluster.
  const cl = clusterState();
  if (e.cluster) e.cluster.hidden = !cl;
  if (cl) {
    if (e.members) e.members.textContent = String(cl.count);
    if (e.sigma) e.sigma.textContent = formatSpeed(cl.sigma);
    if (e.radius) e.radius.textContent = formatDistance(cl.radius);
  }

  if (e.notice) {
    // Two bodies define a line through two points and a slope that means
    // nothing. Say so rather than printing a confident number.
    const thin = !cl && snap.points.length < 5;
    e.notice.hidden = !thin;
    if (thin) {
      e.notice.textContent =
        'A rotation curve needs a population. With this few bodies the fitted slope is not a measurement of anything.';
    }
  }
}

/**
 * Format an exponent the way it is spoken: a sign and two decimals.
 *
 * Fixed decimals rather than significant figures. A genuinely flat curve fits
 * an exponent of a few ten-thousandths, and two significant figures rendered
 * that as "r to the minus 7.36 x 10^-4", which is a hard thing to read as
 * "about zero" and the worst possible presentation of the lesson's punchline.
 *
 * @param {number} v - Exponent
 * @returns {string} Superscript-ready text
 */
export function formatExponent(v) {
  const rounded = Number(Math.abs(v).toFixed(2));
  // Negative zero is not a thing anyone wants to read.
  const sign = v < 0 && rounded > 0 ? '⁻' : '⁺';
  return `${sign}${rounded.toFixed(2)}`;
}

/** Recompute and redraw. Called from the render loop. */
export function updateRotationCurve() {
  if (!enabled) return;
  const snap = rotationCurveState();
  draw(snap);
  renderReadout(snap);
}

/**
 * Open or close the panel.
 * @param {boolean} on - Whether the panel should be shown
 */
export function setRotationCurveEnabled(on) {
  const e = cacheElements();
  enabled = Boolean(on);
  if (e.container) e.container.style.display = enabled ? '' : 'none';
  if (enabled) noteObservationPanelUsed('rotationCurveContainer');
  if (e.toggle) {
    e.toggle.setAttribute('aria-pressed', String(enabled));
    e.toggle.classList.toggle('active', enabled);
  }
  if (enabled) {
    lastFit = null;
    syncControls();
    updateRotationCurve();
  }
  layoutObservationPanels();
}

/** Push the current halo settings into the panel's own controls. */
function syncControls() {
  const e = cacheElements();
  if (e.vFlat) e.vFlat.value = String(getPhysicsSetting('halo_v_flat'));
  if (e.core) {
    e.core.value = String(getPhysicsSetting('halo_core_radius'));
  }
}

/**
 * Switch the halo on or off.
 *
 * Exported because the investigation drives it directly: a step that says
 * "switch the halo on" should switch the same thing the button switches.
 *
 * @param {boolean} on - Whether the halo is part of the force law
 */
export function setDarkMatterHalo(on) {
  updatePhysicsSettings({ dark_matter_halo: Boolean(on) });
  window.dispatchEvent(
    new CustomEvent('gravitasHaloChanged', { detail: { on: Boolean(on) } })
  );
  updateRotationCurve();
}

/** @returns {boolean} Whether the halo is currently in the force law */
export const darkMatterHaloOn = () =>
  Boolean(getPhysicsSetting('dark_matter_halo'));

/** Wire the panel up. Called once at start-up. */
export function initRotationCurve() {
  const e = cacheElements();
  e.toggle?.addEventListener('click', () => setRotationCurveEnabled(!enabled));
  e.close?.addEventListener('click', () => setRotationCurveEnabled(false));
  e.haloBtn?.addEventListener('click', () =>
    setDarkMatterHalo(!getPhysicsSetting('dark_matter_halo'))
  );

  e.vFlat?.addEventListener('input', () => {
    updatePhysicsSettings({ halo_v_flat: Number(e.vFlat.value) });
    updateRotationCurve();
  });
  e.core?.addEventListener('input', () => {
    updatePhysicsSettings({ halo_core_radius: Number(e.core.value) });
    updateRotationCurve();
  });

  // A new world is a new set of bodies, so nothing about the old fit applies.
  window.addEventListener('gravitasSimulationReset', () => {
    lastFit = null;
    syncControls();
  });

  if (e.container) e.container.style.display = 'none';
}
