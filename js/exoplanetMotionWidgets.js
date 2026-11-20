// =============================================================================
// The two moving diagrams of "Finding Planets by Their Tug", and what the
// exoplanet instruments share
// -----------------------------------------------------------------------------
// Both open still and move only when the student presses Run (Pause stops
// them), whatever the Motion choice is: nothing a slider, a preset or opening
// the step does can start them. `reset` is told what the step and the Motion
// choice say (`autorun`, from `autoruns` in js/widgets.js) and answers the same
// way every time, because the instruments are still at open. Moved out of
// js/exoplanetWidgets.js, which imports the helpers and lists the instruments.
// =============================================================================

// Reaches start-up modules; so reaches all of them (js/instrumentStartup.js).
import './instrumentStartup.js';
import {
  radialVelocitySemiAmplitude,
  stellarReflexSemimajorAxis,
  planetSemimajorAxisAboutBarycenter,
} from './exoplanetObservables.js';
import { HD209458 } from './data/exoplanetSystems.js';
import { formatNumber, withUnit } from './format.js';
import { chartColors } from './observationChart.js';
import { surface, responsiveHeight } from './widgetCanvas.js';
import { t } from './i18n/index.js';
import { ensureDeferredMessages } from './i18n/deferredMessages.js';

ensureDeferredMessages().catch(() => {});

export const TAU = Math.PI * 2;

// Jupiter masses per Earth mass, for widgets that let a student sweep from an
// Earth to a hot Jupiter on one slider.
export const EARTH_PER_JUPITER = 317.83;

/**
 * Kepler's third law, in the units these widgets use.
 *
 * @param {number} semiMajorAU - Semi-major axis in AU
 * @param {number} totalMassSolar - Total system mass in solar masses
 * @returns {number} Period in days
 */
export function periodDays(semiMajorAU, totalMassSolar) {
  const years = Math.sqrt(semiMajorAU ** 3 / totalMassSolar);
  return years * 365.25;
}

/**
 * Draw an axis frame with labels, shared by the plotting widgets.
 *
 * @param {CanvasRenderingContext2D} ctx - Target context
 * @param {object} box - {x, y, w, h} plot area
 * @param {object} labels - {x, y} axis titles
 * @param {object} t - Colors from chartColors()
 */
export function drawFrame(ctx, box, labels, t) {
  ctx.strokeStyle = t.grid;
  ctx.lineWidth = 1;
  ctx.strokeRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = t.label;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  if (labels.x) ctx.fillText(labels.x, box.x + box.w / 2, box.y + box.h + 24);
  if (labels.y) {
    ctx.save();
    ctx.translate(box.x - 30, box.y + box.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(labels.y, 0, 0);
    ctx.restore();
  }
  ctx.textAlign = 'left';
}

// One Run button, for whichever of the two is on the panel (never both).
let running = false;
const RUN = [
  {
    id: 'run',
    icon: 'play',
    get label() {
      // Words other families already have: Run, Pause.
      return t(running ? 'stelE.action.pause' : 'energyW.run');
    },
  },
];
/** Opening a step or changing steps stops and rewinds; a slider or preset (`fromControl`) only redraws. */
const still = (v, { fromControl } = {}) => {
  if (fromControl) return;
  running = false;
  v._phase = 0;
};
const toggle = id => {
  if (id === 'run') running = !running;
};
const advance = rate => (v, dt) => {
  if (running) v._phase = ((v._phase || 0) + dt * rate) % TAU;
};

// =============================================================================
// 1. Both of them move
// =============================================================================

const reflexMotion = {
  id: 'reflex-motion',
  get title() {
    return t('exoW.whoIsActuallyMoving');
  },
  get note() {
    return t('exoW.theStarAndThePlanet');
  },
  controls: [
    {
      id: 'mp',
      get label() {
        return t('exoW.planetMass');
      },
      unit: 'M_J',
      min: 0.003,
      max: 12,
      step: 0.001,
      value: 0.69,
      decimals: 3,
    },
    {
      id: 'a',
      get label() {
        return t('exoW.orbitSize');
      },
      unit: 'AU',
      min: 0.02,
      max: 6,
      step: 0.01,
      value: 0.05,
      decimals: 2,
    },
    {
      id: 'mag',
      get label() {
        return t('exoW.stellarWobbleShown');
      },
      unit: '×',
      min: 1,
      max: 3000,
      step: 1,
      value: 400,
      decimals: 0,
    },
  ],
  // `noSystem` withholds the preset that names the real planet's mass.
  presets: (spec = {}) => {
    const all = [
      {
        label: 'HD 209458 b',
        values: { mp: 0.69, a: 0.04747, mag: 400 },
        note: 'A hot Jupiter close in. The star circles a point some thirty millionths of an AU away (a few thousand kilometres), which is why the wobble needs magnifying to see and not to measure.',
      },
      {
        get label() {
          return t('exoW.jupiterAtJupiterSDistance');
        },
        values: { mp: 1, a: 5.2, mag: 60 },
        get note() {
          return t('exoW.theSunReallyDoesThis');
        },
      },
      {
        get label() {
          return t('exoW.anEarth');
        },
        values: { mp: 1 / EARTH_PER_JUPITER, a: 1, mag: 3000 },
        note: 'The same physics, three hundred times smaller. Gravity still gives the planet away, but the signal is thousands of times harder to catch.',
      },
    ];
    return spec.noSystem ? all.slice(1) : all;
  },
  compute: v => {
    const starMassSolar = 1;
    const aStar = stellarReflexSemimajorAxis({
      semiMajorAU: v.a,
      starMassSolar,
      planetMassJupiter: v.mp,
    });
    const aPlanet = planetSemimajorAxisAboutBarycenter({
      semiMajorAU: v.a,
      starMassSolar,
      planetMassJupiter: v.mp,
    });
    return {
      aStar,
      aPlanet,
      ratio: aPlanet / aStar,
      period: periodDays(v.a, starMassSolar),
    };
  },
  animated: true,
  actions: RUN,
  act: toggle,
  step: advance(0.55),
  reset: still,
  draw(canvas, v) {
    const { ctx, w, h } = surface(canvas, responsiveHeight(230, 150));
    const t = chartColors();
    const c = this.compute(v);
    const phase = v._phase || 0;

    const cx = w / 2;
    const cy = h / 2;
    const scale = (Math.min(w, h) / 2 - 30) / v.a;

    // The planet's orbit, at true scale.
    ctx.strokeStyle = t.grid;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, c.aPlanet * scale, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    // The star's orbit, magnified. Labeled, because an unlabeled
    // magnification is a lie about the size of the effect.
    const starOrbitPx = c.aStar * scale * v.mag;
    ctx.strokeStyle = t.accent;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(starOrbitPx, Math.min(w, h) / 2 - 8), 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // The barycenter: the fixed point they both go round.
    ctx.strokeStyle = t.label;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy);
    ctx.lineTo(cx + 6, cy);
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx, cy + 6);
    ctx.stroke();
    ctx.fillStyle = t.label;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('center of mass', cx + 9, cy - 7);

    // Opposite sides, always: that is what "both orbit the barycenter" means.
    const px = cx + Math.cos(phase) * c.aPlanet * scale;
    const py = cy + Math.sin(phase) * c.aPlanet * scale;
    const sx =
      cx - Math.cos(phase) * Math.min(starOrbitPx, Math.min(w, h) / 2 - 8);
    const sy =
      cy - Math.sin(phase) * Math.min(starOrbitPx, Math.min(w, h) / 2 - 8);

    ctx.strokeStyle = t.grid;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#fff3df';
    ctx.beginPath();
    ctx.arc(sx, sy, 11, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#c9a882';
    ctx.beginPath();
    ctx.arc(px, py, 4.5, 0, TAU);
    ctx.fill();

    ctx.fillStyle = t.tick;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`stellar wobble shown ×${Math.round(v.mag)}`, 8, h - 8);
  },
  readout(v) {
    const c = this.compute(v);
    return [
      {
        id: 'aStar',
        get label() {
          return t('exoW.starSOwnOrbit');
        },
        value: withUnit(formatNumber(c.aStar, { sig: 3 }), 'AU'),
        // As a number a field and the neutral-start check can read; the row prints it as 1.43 × 10⁻⁵.
        text: c.aStar.toExponential(2),
        emphasis: true,
      },
      {
        get label() {
          return t('exoW.planetSOrbit');
        },
        value: withUnit(formatNumber(c.aPlanet, { sig: 3 }), 'AU'),
      },
      {
        get label() {
          return t('exoW.planetSOrbitIsBigger');
        },
        value: `${formatNumber(c.ratio, { sig: 3 })}×`,
      },
      {
        get label() {
          return t('exoW.bothGoRoundOnceEvery');
        },
        value: withUnit(formatNumber(c.period, { sig: 3 }), 'days'),
      },
    ];
  },
};

// =============================================================================
// 2. Toward us, away from us
// =============================================================================

const rvObserver = {
  id: 'rv-observer',
  get title() {
    return t('exoW.towardUsAwayFromUs');
  },
  note: 'The dot on the ring is the star. The graph is the only part of its motion a spectrograph can see: the part along our line of sight.',
  controls: [
    {
      id: 'mp',
      get label() {
        return t('exoW.planetMass');
      },
      unit: 'M_J',
      min: 0.01,
      max: 10,
      step: 0.01,
      value: 0.69,
      decimals: 2,
    },
    {
      id: 'inc',
      get label() {
        return t('exoW.inclination');
      },
      unit: '°',
      min: 0,
      max: 90,
      step: 1,
      value: 90,
      decimals: 0,
    },
  ],
  compute: v => {
    const K = radialVelocitySemiAmplitude({
      starMassSolar: HD209458.star.massSolar,
      planetMassJupiter: v.mp,
      periodDays: HD209458.planet.periodDays,
      inclinationDeg: v.inc,
    });
    return { K };
  },
  animated: true,
  actions: RUN,
  act: toggle,
  step: advance(0.7),
  reset: still,
  draw(canvas, v) {
    const { ctx, w, h } = surface(canvas, responsiveHeight(230, 150));
    const t = chartColors();
    const c = this.compute(v);
    const phase = v._phase || 0;

    // Left: the orbit seen from above, with the observer off to one side.
    const orbR = Math.min(w * 0.42, h) / 2 - 26;
    const cx = w * 0.24;
    const cy = h / 2;
    ctx.strokeStyle = t.grid;
    ctx.beginPath();
    ctx.arc(cx, cy, orbR, 0, TAU);
    ctx.stroke();

    const sx = cx + Math.cos(phase) * orbR;
    const sy = cy + Math.sin(phase) * orbR;
    ctx.fillStyle = '#fff3df';
    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, TAU);
    ctx.fill();

    // Which way is "us". The line-of-sight velocity is the projection of the
    // star's motion onto this direction.
    ctx.strokeStyle = t.label;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + orbR + 22, cy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = t.label;
    ctx.font = '11px system-ui, sans-serif';
    // Over the near end of the dashed line rather than the far end. The far
    // end is a few pixels from the plot's own rotated "RV (m/s)" title, and
    // the two ran together at a legible size.
    ctx.textAlign = 'left';
    ctx.fillText('to us', cx + 8, cy - 6);

    // The instantaneous radial velocity, as an arrow along the line of sight.
    const rv = -Math.sin(phase) * c.K;
    const arrow = (rv / Math.max(1, c.K)) * 26;
    ctx.strokeStyle = rv > 0 ? t.warm : t.cool;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - arrow, sy);
    ctx.stroke();
    ctx.lineWidth = 1;

    // Right: the curve that produces.
    const box = { x: w * 0.52, y: 18, w: w * 0.42, h: h - 60 };
    drawFrame(ctx, box, { x: 'One orbit', y: 'RV (m/s)' }, t);
    ctx.strokeStyle = t.grid;
    ctx.beginPath();
    ctx.moveTo(box.x, box.y + box.h / 2);
    ctx.lineTo(box.x + box.w, box.y + box.h / 2);
    ctx.stroke();

    const maxK = radialVelocitySemiAmplitude({
      starMassSolar: HD209458.star.massSolar,
      planetMassJupiter: 10,
      periodDays: HD209458.planet.periodDays,
    });
    ctx.strokeStyle = t.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const p = (i / 120) * TAU;
      const y =
        box.y + box.h / 2 - (-Math.sin(p) * c.K * (box.h / 2 - 6)) / maxK;
      const x = box.x + (i / 120) * box.w;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.lineWidth = 1;

    // Where the star is now, on its own curve.
    const markX = box.x + (phase / TAU) * box.w;
    const markY =
      box.y + box.h / 2 - (rv * (box.h / 2 - 6)) / Math.max(1, maxK);
    ctx.fillStyle = rv > 0 ? t.warm : t.cool;
    ctx.beginPath();
    ctx.arc(markX, markY, 4, 0, TAU);
    ctx.fill();

    ctx.fillStyle = t.tick;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(rv > 0 ? 'away from us' : 'toward us', box.x, h - 8);
  },
  readout(v) {
    const c = this.compute(v);
    const phase = v._phase || 0;
    const rv = -Math.sin(phase) * c.K;
    return [
      {
        get label() {
          return t('exoW.radialVelocityNow');
        },
        value: `${rv >= 0 ? '+' : '−'}${withUnit(formatNumber(Math.abs(rv)), 'm/s')}`,
      },
      {
        get label() {
          return t('exoW.whichWay');
        },
        value:
          Math.abs(rv) < 0.5
            ? 'across our view'
            : rv > 0
              ? 'AWAY FROM US'
              : 'TOWARD US',
        emphasis: true,
      },
      {
        get label() {
          return t('exoW.semiAmplitudeK');
        },
        value: withUnit(formatNumber(c.K), 'm/s'),
      },
    ];
  },
};

export const MOTION_WIDGETS = [reflexMotion, rvObserver];
