// =============================================================================
// Instruments for "Finding Planets by Their Tug"
// -----------------------------------------------------------------------------
// Analytical teaching instruments, in the same spirit as transitWidgets.js. The
// live panels are better for watching a real orbit produce a real curve; these
// are better for the controlled experiment, where a student changes one thing
// and reads what happened without waiting for an N-body simulation to come
// round again.
//
// All physics comes from js/exoplanetObservables.js and, for the habitable-zone
// question at the end, from js/habitability.js. Nothing here recomputes a
// quantity another module already owns: the final characterization panel must
// agree with The Goldilocks Question exactly, and the only way to guarantee that
// is to call the same function.
// =============================================================================

import {
  radialVelocitySemiAmplitude,
  stellarReflexSemimajorAxis,
  planetSemimajorAxisAboutBarycenter,
  astrometricSignature,
  chooseAngularUnit,
  planetBulkDensity,
  minimumPlanetMass,
} from './exoplanetObservables.js';
import {
  relativeInsolation,
  habitableZoneBounds,
  habitableZoneStatus,
} from './habitability.js';
import { gaussianAt, phaseCoverage, surveyStats } from './rvSurvey.js';
import { HD209458, SUN_JUPITER } from './data/exoplanetSystems.js';
import { formatNumber, withUnit } from './format.js';
import { chartColors } from './observationChart.js';
import { surface, responsiveHeight } from './widgetCanvas.js';
import { t } from './i18n/index.js';

const TAU = Math.PI * 2;

// Jupiter masses per Earth mass, for widgets that let a student sweep from an
// Earth to a hot Jupiter on one slider.
const EARTH_PER_JUPITER = 317.83;

/**
 * Kepler's third law, in the units these widgets use.
 *
 * @param {number} semiMajorAU - Semi-major axis in AU
 * @param {number} totalMassSolar - Total system mass in solar masses
 * @returns {number} Period in days
 */
function periodDays(semiMajorAU, totalMassSolar) {
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
function drawFrame(ctx, box, labels, t) {
  ctx.strokeStyle = t.grid;
  ctx.lineWidth = 1;
  ctx.strokeRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = t.label;
  ctx.font = '10px system-ui, sans-serif';
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
  presets: [
    {
      label: 'HD 209458 b',
      values: { mp: 0.69, a: 0.04747, mag: 400 },
      note: 'A hot Jupiter close in. The star circles a point 2.7 millionths of an AU away, which is why the wobble needs magnifying to see and not to measure.',
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
  ],
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
  step: (v, dt) => {
    v._phase = ((v._phase || 0) + dt * 0.55) % TAU;
  },
  reset: v => {
    v._phase = 0;
  },
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
    ctx.font = '10px system-ui, sans-serif';
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
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText(`stellar wobble shown ×${Math.round(v.mag)}`, 8, h - 8);
  },
  readout(v) {
    const c = this.compute(v);
    return [
      {
        get label() {
          return t('exoW.starSOwnOrbit');
        },
        value: withUnit(formatNumber(c.aStar, { sig: 3 }), 'AU'),
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
  step: (v, dt) => {
    v._phase = ((v._phase || 0) + dt * 0.7) % TAU;
  },
  reset: v => {
    v._phase = 0;
  },
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
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('to us', cx + orbR + 4, cy - 6);

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
    ctx.font = '10px system-ui, sans-serif';
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

// =============================================================================
// 3. What makes K bigger?
// =============================================================================

const rvMass = {
  id: 'rv-mass',
  get title() {
    return t('exoW.whatMakesTheWobbleBigger');
  },
  get note() {
    return t('exoW.oneThingChangesAtA');
  },
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
  ],
  presets: [
    {
      get label() {
        return t('exoW.anEarth');
      },
      values: { mp: 1 / EARTH_PER_JUPITER },
    },
    {
      get label() {
        return t('exoW.aNeptune');
      },
      values: { mp: 0.054 },
    },
    { label: 'HD 209458 b', values: { mp: 0.69 } },
    {
      get label() {
        return t('exoW.aHeavyJupiter');
      },
      values: { mp: 5 },
    },
  ],
  compute: v => ({
    K: radialVelocitySemiAmplitude({
      starMassSolar: HD209458.star.massSolar,
      planetMassJupiter: v.mp,
      periodDays: HD209458.planet.periodDays,
    }),
  }),
  draw(canvas, v) {
    const { ctx, w, h } = surface(canvas, responsiveHeight(230, 150));
    const t = chartColors();
    const box = { x: 46, y: 16, w: w - 66, h: h - 54 };
    drawFrame(ctx, box, { x: 'Planet mass (Jupiters)', y: 'K (m/s)' }, t);

    const maxM = 10;
    const maxK = radialVelocitySemiAmplitude({
      starMassSolar: HD209458.star.massSolar,
      planetMassJupiter: maxM,
      periodDays: HD209458.planet.periodDays,
    });

    ctx.strokeStyle = t.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const m = (i / 100) * maxM;
      const K = radialVelocitySemiAmplitude({
        starMassSolar: HD209458.star.massSolar,
        planetMassJupiter: m,
        periodDays: HD209458.planet.periodDays,
      });
      const x = box.x + (m / maxM) * box.w;
      const y = box.y + box.h - (K / maxK) * box.h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.lineWidth = 1;

    const c = this.compute(v);
    const x = box.x + (v.mp / maxM) * box.w;
    const y = box.y + box.h - (c.K / maxK) * box.h;
    ctx.strokeStyle = t.grid;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(box.x, y);
    ctx.lineTo(x, y);
    ctx.moveTo(x, y);
    ctx.lineTo(x, box.y + box.h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = t.accent;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, TAU);
    ctx.fill();
  },
  readout(v) {
    const c = this.compute(v);
    const earths = v.mp * EARTH_PER_JUPITER;
    return [
      {
        get label() {
          return t('exoW.planetMass');
        },
        value: `${withUnit(formatNumber(v.mp), 'M_J')} (${withUnit(formatNumber(earths, { sig: 2 }), 'M⊕')})`,
      },
      {
        get label() {
          return t('exoW.semiAmplitudeK');
        },
        value: withUnit(formatNumber(c.K), 'm/s'),
        emphasis: true,
      },
      {
        get label() {
          return t('exoW.doubleTheMassAndK');
        },
        value: 'doubles too: the line is straight',
      },
    ];
  },
};

// =============================================================================
// 4. The inclination problem
// =============================================================================

const rvInclination = {
  id: 'rv-inclination',
  get title() {
    return t('exoW.theSamePlanetTilted');
  },
  get note() {
    return t('exoW.thePlanetDoesNotChange');
  },
  controls: [
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
    {
      id: 'mp',
      get label() {
        return t('exoW.truePlanetMass');
      },
      unit: 'M_J',
      min: 0.05,
      max: 5,
      step: 0.01,
      value: 0.69,
      decimals: 2,
    },
  ],
  presets: [
    {
      get label() {
        return t('exoW.edgeOn90');
      },
      values: { inc: 90 },
      get note() {
        return t('exoW.aTransitingSystemIsClose');
      },
    },
    { label: '60°', values: { inc: 60 } },
    { label: '30°', values: { inc: 30 } },
    {
      get label() {
        return t('exoW.faceOn5');
      },
      values: { inc: 5 },
      get note() {
        return t('exoW.almostNoRadialVelocitySignal');
      },
    },
  ],
  compute: v => {
    const K = radialVelocitySemiAmplitude({
      starMassSolar: HD209458.star.massSolar,
      planetMassJupiter: v.mp,
      periodDays: HD209458.planet.periodDays,
      inclinationDeg: v.inc,
    });
    const inferred = minimumPlanetMass({
      semiAmplitudeMs: K,
      starMassSolar: HD209458.star.massSolar,
      periodDays: HD209458.planet.periodDays,
    });
    return { K, inferred, sinI: Math.sin((v.inc * Math.PI) / 180) };
  },
  draw(canvas, v) {
    const { ctx, w, h } = surface(canvas, responsiveHeight(230, 150));
    const t = chartColors();
    const c = this.compute(v);

    // A tilted orbit, drawn as a disc squashed by cos i.
    const cx = w * 0.25;
    const cy = h / 2;
    const r = Math.min(w * 0.4, h) / 2 - 24;
    const squash = Math.cos((v.inc * Math.PI) / 180);
    ctx.strokeStyle = t.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, Math.max(1, r * squash), 0, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#fff3df';
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = t.tick;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(v.inc)}° from face-on view`, cx, h - 8);
    ctx.textAlign = 'left';

    // Two bars: what is there, and what RV alone can tell you.
    const bx = w * 0.55;
    const bw = w * 0.36;
    const bar = (y, frac, color, label) => {
      ctx.fillStyle = t.grid;
      ctx.fillRect(bx, y, bw, 16);
      ctx.fillStyle = color;
      ctx.fillRect(bx, y, bw * Math.max(0, Math.min(1, frac)), 16);
      ctx.fillStyle = t.label;
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(label, bx, y - 4);
    };
    const maxShown = Math.max(v.mp, 0.01);
    bar(h * 0.28, 1, t.accent, `True mass  ${formatNumber(v.mp)} M_J`);
    bar(
      h * 0.56,
      c.inferred / maxShown,
      t.warm,
      `RV says at least  ${formatNumber(c.inferred)} M_J`
    );
  },
  readout(v) {
    const c = this.compute(v);
    return [
      {
        get label() {
          return t('exoW.truePlanetMass');
        },
        value: withUnit(formatNumber(v.mp), 'M_J'),
      },
      {
        get label() {
          return t('exoW.kWeWouldMeasure');
        },
        value: withUnit(formatNumber(c.K), 'm/s'),
      },
      {
        get label() {
          return t('exoW.massRvAloneReports');
        },
        value: withUnit(formatNumber(c.inferred), 'M_J'),
        emphasis: true,
      },
      {
        get label() {
          return t('exoW.thatIsTheTrueMass');
        },
        value: `sin i = ${formatNumber(c.sinI, { sig: 3 })}`,
      },
      {
        get label() {
          return t('exoW.soRadialVelocityGives');
        },
        value: v.inc > 85 ? 'nearly the true mass' : 'a lower limit only',
      },
    ];
  },
};

// =============================================================================
// 5. The other wobble
// =============================================================================

const astrometrySignature = {
  id: 'astrometry-signature',
  get title() {
    return t('exoW.theWobbleAcrossTheSky');
  },
  get note() {
    return t('exoW.astrometryMeasuresWhereTheStar');
  },
  controls: [
    {
      id: 'mp',
      get label() {
        return t('exoW.planetMass');
      },
      unit: 'M_J',
      min: 0.01,
      max: 12,
      step: 0.01,
      value: 1,
      decimals: 2,
    },
    {
      id: 'a',
      get label() {
        return t('exoW.orbitSize');
      },
      unit: 'AU',
      min: 0.02,
      max: 20,
      step: 0.01,
      value: 5.2,
      decimals: 2,
    },
    {
      id: 'd',
      get label() {
        return t('exoW.distance');
      },
      unit: 'pc',
      min: 1,
      max: 200,
      step: 1,
      value: 10,
      decimals: 0,
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
      value: 45,
      decimals: 0,
    },
  ],
  presets: [
    {
      label: 'HD 209458 b',
      values: {
        mp: HD209458.planet.massJupiter,
        a: HD209458.planet.semiMajorAU,
        d: HD209458.star.distancePc,
        inc: 87,
      },
      get note() {
        return t('exoW.aTextbookRadialVelocityTarget');
      },
    },
    {
      get label() {
        return t('exoW.sunAndJupiterAt10');
      },
      values: {
        mp: 1,
        a: SUN_JUPITER.planet.semiMajorAU,
        d: 10,
        inc: 45,
      },
      get note() {
        return t('exoW.theSameMethodAWide');
      },
    },
    {
      get label() {
        return t('exoW.twiceAsFarAway');
      },
      values: { mp: 1, a: 5.2, d: 20, inc: 45 },
      get note() {
        return t('exoW.theStarSOrbitHas');
      },
    },
  ],
  compute: v => {
    const aStar = stellarReflexSemimajorAxis({
      semiMajorAU: v.a,
      starMassSolar: 1,
      planetMassJupiter: v.mp,
    });
    const sig = astrometricSignature({ starReflexAU: aStar, distancePc: v.d });
    return {
      aStar,
      sig,
      unit: chooseAngularUnit(sig.arcsec),
      period: periodDays(v.a, 1),
    };
  },
  draw(canvas, v) {
    const { ctx, w, h } = surface(canvas, responsiveHeight(230, 150));
    const t = chartColors();
    const squash = Math.cos((v.inc * Math.PI) / 180);

    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) / 2 - 34;

    // The path traced on the sky. Equal scales, so the shape is the message.
    ctx.strokeStyle = t.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, Math.max(0.6, r * squash), 0, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 1;

    ctx.strokeStyle = t.label;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy);
    ctx.lineTo(cx + 6, cy);
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx, cy + 6);
    ctx.stroke();

    ctx.fillStyle = '#fff3df';
    ctx.beginPath();
    ctx.arc(cx + r, cy, 6, 0, TAU);
    ctx.fill();

    const c = this.compute(v);
    ctx.fillStyle = t.tick;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${formatNumber(c.unit.value, { sig: 3 })} ${c.unit.unit} across`,
      cx,
      h - 10
    );
    ctx.fillText(
      v.inc > 80
        ? 'seen edge-on: a line'
        : v.inc < 15
          ? 'seen face-on: a circle'
          : 'seen tilted: an ellipse',
      cx,
      14
    );
    ctx.textAlign = 'left';
  },
  readout(v) {
    const c = this.compute(v);
    return [
      {
        get label() {
          return t('exoW.starSReflexOrbit');
        },
        value: withUnit(formatNumber(c.aStar, { sig: 3 }), 'AU'),
      },
      {
        get label() {
          return t('exoW.angularSignature');
        },
        value: `${formatNumber(c.unit.value, { sig: 3 })} ${c.unit.unit}`,
        emphasis: true,
      },
      {
        get label() {
          return t('exoW.orbitalPeriod');
        },
        value: withUnit(formatNumber(c.period / 365.25, { sig: 3 }), 'years'),
      },
      {
        get label() {
          return t('exoW.distanceChanges');
        },
        value: 'the angle only, never the orbit',
      },
    ];
  },
};

// =============================================================================
// 6. Which method survives?
// =============================================================================

const methodComparison = {
  id: 'method-comparison',
  get title() {
    return t('exoW.threeMethodsOneSystem');
  },
  get note() {
    return t('exoW.tiltTheSamePlanetAnd');
  },
  controls: [
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
    const sinI = Math.sin((v.inc * Math.PI) / 180);
    const cosI = Math.cos((v.inc * Math.PI) / 180);
    // A transit needs the planet's track to cross the stellar disc. For this
    // system that means an inclination within a few degrees of edge-on.
    const aOverR =
      (HD209458.planet.semiMajorAU * 215.032) / HD209458.star.radiusSolar;
    const transits = Math.abs(cosI) < 1 / aOverR;
    return {
      sinI,
      transits,
      rvFraction: sinI,
      // The astrometric semi-major axis does not shrink with inclination; the
      // projected figure changes shape. Teaching otherwise is the single
      // commonest error about this method.
      astrometryFraction: 1,
      minorAxisFraction: Math.abs(cosI),
    };
  },
  draw(canvas, v) {
    const { ctx, w, h } = surface(canvas, responsiveHeight(230, 150));
    // Named `colors` rather than `t`, which is the translation function this
    // module imports. It used to be called `t`, shadowing the import inside
    // this one method - so every t('exoW....') below called the colour
    // palette as a function, draw() threw on its first row, and the engine
    // logged a warning and left the canvas blank. The widget had never
    // drawn. Found by the investigation walker, which checks that a canvas
    // a step names has more than one colour in it.
    const colors = chartColors();
    const c = this.compute(v);
    const rows = [
      {
        get name() {
          return t('exoW.transit');
        },
        gives: 'radius',
        frac: c.transits ? 1 : 0,
        text: c.transits ? 'transits' : 'no transit',
      },
      {
        get name() {
          return t('exoW.radialVelocity');
        },
        gives: 'mass × sin i',
        frac: c.rvFraction,
        text: `${Math.round(c.rvFraction * 100)}% of full`,
      },
      {
        get name() {
          return t('exoW.astrometry');
        },
        gives: 'mass, and the orbit',
        frac: 1,
        text:
          v.inc > 80
            ? 'full: a line'
            : v.inc < 15
              ? 'full: a circle'
              : 'full: an ellipse',
      },
    ];
    const bx = 128;
    // Room for the annotation to the right of every bar, at the longest
    // string any of them uses.
    const bw = w - bx - 118;
    rows.forEach((row, i) => {
      const y = 24 + i * ((h - 44) / 3);
      ctx.fillStyle = colors.label;
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(row.name, 8, y + 12);
      ctx.fillStyle = colors.tick;
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillText(`→ ${row.gives}`, 8, y + 24);

      ctx.fillStyle = colors.grid;
      ctx.fillRect(bx, y, bw, 15);
      ctx.fillStyle = row.frac > 0.02 ? colors.accent : colors.warm;
      ctx.fillRect(bx, y, Math.max(2, bw * row.frac), 15);
      ctx.fillStyle = colors.tick;
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillText(row.text, bx + bw + 6, y + 12);
    });
  },
  readout(v) {
    const c = this.compute(v);
    return [
      {
        get label() {
          return t('exoW.transit');
        },
        value: c.transits
          ? 'yes: gives radius and pins sin i near 1'
          : 'none at this tilt',
      },
      {
        get label() {
          return t('exoW.radialVelocity');
        },
        value: `${formatNumber(c.rvFraction * 100, { sig: 3 })}% of the edge-on signal`,
      },
      {
        get label() {
          return t('exoW.astrometry');
        },
        value: 'full signal at every tilt, different shape',
        emphasis: true,
      },
      {
        get label() {
          return t('exoW.together');
        },
        value: 'radius, true mass, and the orbit',
      },
    ];
  },
};

// =============================================================================
// 7. Putting it together
// =============================================================================

const planetCharacterization = {
  id: 'planet-characterization',
  get title() {
    return t('exoW.whatDoWeActuallyKnow');
  },
  get note() {
    return t('exoW.eachRowIsOneObservation');
  },
  controls: [
    {
      id: 'rp',
      get label() {
        return t('exoW.radiusFromTheTransit');
      },
      unit: 'R_J',
      min: 0.05,
      max: 2.5,
      step: 0.01,
      value: HD209458.planet.radiusJupiter,
      decimals: 2,
    },
    {
      id: 'mp',
      get label() {
        return t('exoW.massFromRadialVelocity');
      },
      unit: 'M_J',
      min: 0.002,
      max: 5,
      step: 0.001,
      value: HD209458.planet.massJupiter,
      decimals: 3,
    },
    {
      id: 'a',
      get label() {
        return t('exoW.orbitSize');
      },
      unit: 'AU',
      min: 0.01,
      max: 5,
      step: 0.001,
      value: HD209458.planet.semiMajorAU,
      decimals: 3,
    },
    {
      id: 'lum',
      get label() {
        return t('exoW.starSLuminosity');
      },
      unit: 'L☉',
      min: 0.001,
      max: 10,
      step: 0.001,
      value: HD209458.star.luminositySolar,
      decimals: 3,
    },
    {
      id: 'teff',
      get label() {
        return t('exoW.starSTemperature');
      },
      unit: 'K',
      min: 2600,
      max: 7200,
      step: 10,
      value: HD209458.star.temperatureK,
      decimals: 0,
    },
  ],
  presets: [
    {
      label: 'HD 209458 b',
      values: {
        rp: HD209458.planet.radiusJupiter,
        mp: HD209458.planet.massJupiter,
        a: HD209458.planet.semiMajorAU,
        lum: HD209458.star.luminositySolar,
        teff: HD209458.star.temperatureK,
      },
      get note() {
        return t('exoW.thePlanetThisLessonMeasured');
      },
    },
    {
      get label() {
        return t('exoW.planetAARockyCandidate');
      },
      values: { rp: 0.0981, mp: 0.0044, a: 1.02, lum: 0.6, teff: 5400 },
      note: 'A little larger than Earth and a little heavier, at a density much like Earth’s, in the modeled zone of a slightly cooler star.',
    },
    {
      get label() {
        return t('exoW.planetBPuffy');
      },
      values: { rp: 0.223, mp: 0.0189, a: 0.95, lum: 0.6, teff: 5400 },
      note: 'Two and a half Earth radii but only six Earth masses. The same zone, a very different world: too light for its size to be rock.',
    },
    {
      get label() {
        return t('exoW.planetCRockyTooHot');
      },
      values: { rp: 0.0937, mp: 0.0041, a: 0.14, lum: 0.6, teff: 5400 },
      get note() {
        return t('exoW.aRockyDensityAndFar');
      },
    },
  ],
  compute: v => {
    const density = planetBulkDensity({
      massJupiter: v.mp,
      radiusJupiter: v.rp,
    });
    // Reused, never reimplemented: the habitability module is the same one The
    // Goldilocks Question uses, so the two lessons cannot disagree.
    const flux = relativeInsolation(v.lum, v.a);
    const bounds = habitableZoneBounds({
      luminositySolar: v.lum,
      teffK: v.teff,
    });
    const status = habitableZoneStatus(v.a, bounds);
    const radiusEarth = v.rp * 11.209;
    const massEarth = v.mp * EARTH_PER_JUPITER;
    return { density, flux, bounds, status, radiusEarth, massEarth };
  },
  draw(canvas, v) {
    const { ctx, w, h } = surface(canvas, responsiveHeight(230, 150));
    const t = chartColors();
    const c = this.compute(v);

    const rows = [
      [
        'Transit depth',
        'Radius',
        `${formatNumber(c.radiusEarth, { sig: 3 })} R⊕`,
      ],
      [
        'RV semi-amplitude',
        'Mass',
        `${formatNumber(c.massEarth, { sig: 3 })} M⊕`,
      ],
      [
        'Mass + radius',
        'Bulk density',
        `${formatNumber(c.density.gramsPerCm3, { sig: 3 })} g/cm³`,
      ],
      [
        'Orbit + luminosity',
        'Starlight received',
        `${formatNumber(c.flux, { sig: 3 })} × Earth`,
      ],
      ['Flux + climate model', 'Habitable zone', c.status.label],
    ];

    const rowH = (h - 12) / rows.length;
    rows.forEach((row, i) => {
      const y = 6 + i * rowH;
      if (i % 2 === 0) {
        ctx.fillStyle = t.grid;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(4, y, w - 8, rowH - 2);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = t.tick;
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillText(row[0].toUpperCase(), 10, y + 13);
      ctx.fillStyle = t.label;
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(row[1], 10, y + 26);
      ctx.fillStyle = t.accent;
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(row[2], w - 10, y + 22);
      ctx.textAlign = 'left';
    });
  },
  readout(v) {
    const c = this.compute(v);
    // Deliberately hedged language. Bulk density narrows the possibilities; it
    // does not name an interior, and several mixtures land on one number.
    const composition =
      c.density.gramsPerCm3 > 3.5
        ? 'most consistent with a predominantly rocky body'
        : c.density.gramsPerCm3 > 1.5
          ? 'consistent with rock and a substantial amount of water or ice'
          : 'too low for rock: likely dominated by a gas envelope';
    return [
      {
        get label() {
          return t('exoW.bulkDensity');
        },
        value: `${withUnit(formatNumber(c.density.gramsPerCm3, { sig: 3 }), 'g/cm³')} (${formatNumber(c.density.relativeToEarth, { sig: 2 })}× Earth)`,
        emphasis: true,
      },
      {
        get label() {
          return t('exoW.whichMeans');
        },
        value: composition,
      },
      {
        get label() {
          return t('exoW.starlightReceived');
        },
        value: `${formatNumber(c.flux, { sig: 3 })} × what Earth gets`,
      },
      {
        get label() {
          return t('exoW.modeledHabitableZone');
        },
        value: `${formatNumber(c.bounds.innerAU, { sig: 3 })} to ${withUnit(formatNumber(c.bounds.outerAU, { sig: 3 }), 'AU')}`,
      },
      {
        get label() {
          return t('exoW.thisPlanetIs');
        },
        value: c.status.label,
        emphasis: true,
      },
    ];
  },
};

// =============================================================================
// 8. What a schedule can and cannot see
// =============================================================================
// The instrument "Can You Detect This Planet?" is built around. Everything
// above draws the signal; this one draws what a programme with a finite number
// of nights actually comes home with.
//
// It is analytic rather than integrated, for the same reason the other widgets
// here are: a student comparing two schedules has to be able to change one and
// see the answer, and waiting forty simulated days for the second run is not
// comparing. The noise comes from js/rvSurvey.js, so the scatter on this plot
// and the scatter in the live panel are drawn from the same generator and a
// seed means the same thing in both places.
//
// What it must not do is announce a detection. The readout reports what was
// observed and how surprising the scatter is if the star's velocity never
// changed - which is a statement about constancy, not about planets - and says
// so in as many words.

/** Ten phase bins is the resolution the coverage readout quotes. */
const PHASE_BINS = 10;

/**
 * The measurements one schedule would produce from one planet.
 *
 * @param {object} v - Control values
 * @returns {object} The signal, the schedule and the points
 */
function sampleSchedule(v) {
  const period = HD209458.planet.periodDays;
  const K = radialVelocitySemiAmplitude({
    starMassSolar: HD209458.star.massSolar,
    planetMassJupiter: v.mp,
    periodDays: period,
  });
  const n = Math.max(2, Math.round(v.n));
  const cadence = Math.max(0.01, v.cadence);
  const sigma = Math.max(0, v.sigma);

  const points = [];
  for (let i = 0; i < n; i++) {
    const day = i * cadence;
    const truth = -K * Math.sin((TAU * day) / period);
    points.push({
      index: i,
      day,
      truth,
      rv: truth + (sigma > 0 ? sigma * gaussianAt(v.seed ?? 1, i) : 0),
      sigma,
    });
  }
  return { period, K, cadence, sigma, n, points };
}

const surveySchedule = {
  id: 'survey-schedule',
  get title() {
    return t('exoW.whatYourScheduleSees');
  },
  get note() {
    return t('exoW.theDashedCurveIsTheTruth');
  },
  controls: [
    {
      id: 'cadence',
      get label() {
        return t('exoW.daysBetweenMeasurements');
      },
      unit: 'd',
      min: 0.05,
      max: 8,
      step: 0.01,
      value: 0.32,
      decimals: 2,
    },
    {
      id: 'n',
      get label() {
        return t('exoW.numberOfMeasurements');
      },
      unit: '',
      min: 4,
      max: 40,
      step: 1,
      value: 12,
      decimals: 0,
    },
    {
      id: 'sigma',
      get label() {
        return t('exoW.measurementUncertainty');
      },
      unit: 'm/s',
      min: 0,
      max: 40,
      step: 0.5,
      value: 8,
      decimals: 1,
    },
    {
      id: 'mp',
      get label() {
        return t('exoW.planetMass');
      },
      unit: 'M_J',
      min: 0.01,
      max: 3,
      step: 0.01,
      value: 0.69,
      decimals: 2,
    },
    {
      id: 'seed',
      get label() {
        return t('exoW.noiseSeed');
      },
      unit: '',
      min: 1,
      max: 40,
      step: 1,
      value: 1,
      decimals: 0,
    },
  ],
  presets: [
    {
      get label() {
        return t('exoW.scheduleAIntensive');
      },
      values: { cadence: 0.32, n: 12, sigma: 8, mp: 0.69 },
      get note() {
        return t('exoW.scheduleAIntensive.note');
      },
    },
    {
      get label() {
        return t('exoW.scheduleBPatient');
      },
      values: { cadence: 3.52, n: 12, sigma: 8, mp: 0.69 },
      get note() {
        return t('exoW.scheduleBPatient.note');
      },
    },
    {
      get label() {
        return t('exoW.aSmallerPlanet');
      },
      values: { cadence: 0.32, n: 12, sigma: 8, mp: 0.06 },
      get note() {
        return t('exoW.aSmallerPlanet.note');
      },
    },
    {
      get label() {
        return t('exoW.aBetterSpectrograph');
      },
      values: { cadence: 0.32, n: 12, sigma: 1, mp: 0.06 },
      get note() {
        return t('exoW.aBetterSpectrograph.note');
      },
    },
  ],
  compute(v) {
    const s = sampleSchedule(v);
    const stats = surveyStats(s.points, { periodDays: s.period });
    const coverage = phaseCoverage(
      s.points.map(p => p.day),
      s.period,
      PHASE_BINS
    );
    return { ...s, stats, coverage, baseline: (s.n - 1) * s.cadence };
  },
  draw(canvas, v) {
    const { ctx, w, h } = surface(canvas, responsiveHeight(250, 170));
    const th = chartColors();
    const c = this.compute(v);

    // The vertical scale is the planet's own amplitude plus a few error bars,
    // so a run that sees nothing looks like a run that sees nothing rather
    // than being auto-scaled up into a convincing wiggle. That auto-scaling is
    // the single most misleading thing a plot of a nondetection can do.
    const span = Math.max(c.K * 1.25, c.sigma * 3, 1);

    const gap = 26;
    const boxW = (w - 78 - gap) / 2;
    const left = { x: 52, y: 16, w: boxW, h: h - 66 };
    const right = { x: 52 + boxW + gap, y: 16, w: boxW, h: h - 66 };

    const yOf = (box, rv) => box.y + box.h / 2 - (rv / span) * (box.h / 2 - 6);

    /** Zero, where the systemic velocity sits. */
    const zeroLine = box => {
      ctx.strokeStyle = th.grid;
      ctx.beginPath();
      ctx.moveTo(box.x, yOf(box, 0));
      ctx.lineTo(box.x + box.w, yOf(box, 0));
      ctx.stroke();
    };

    /** One measurement, with its error bar. Points, never a joining line. */
    const drawPoint = (box, x, rv, sigma) => {
      const y = yOf(box, rv);
      if (sigma > 0) {
        const half = (sigma / span) * (box.h / 2 - 6);
        ctx.strokeStyle = th.accent;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y - half);
        ctx.lineTo(x, y + half);
        ctx.moveTo(x - 2.5, y - half);
        ctx.lineTo(x + 2.5, y - half);
        ctx.moveTo(x - 2.5, y + half);
        ctx.lineTo(x + 2.5, y + half);
        ctx.stroke();
      }
      ctx.fillStyle = th.accent;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, TAU);
      ctx.fill();
    };

    // --- Left: the run as it happened, against the clock ---------------------
    drawFrame(ctx, left, { x: t('exoW.daysAxis'), y: 'RV (m/s)' }, th);
    zeroLine(left);

    const totalDays = Math.max(c.baseline, c.cadence);
    const xTime = day => left.x + (day / Math.max(totalDays, 1e-6)) * left.w;

    // The truth, dashed and labelled. It is drawn only across the span the
    // programme actually covered: extending it past the last night would be
    // showing a curve nobody observed.
    ctx.save();
    ctx.strokeStyle = th.label;
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    const steps = 400;
    for (let i = 0; i <= steps; i++) {
      const day = (i / steps) * totalDays;
      const rv = -c.K * Math.sin((TAU * day) / c.period);
      const x = xTime(day);
      const y = yOf(left, rv);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    for (const p of c.points) drawPoint(left, xTime(p.day), p.rv, p.sigma);

    // --- Right: the same points folded on the period -------------------------
    drawFrame(ctx, right, { x: t('exoW.phaseAxis'), y: '' }, th);
    zeroLine(right);

    // The phase bins the coverage number counts, so the reader can see which
    // ones are empty rather than taking "2 of 10" on trust.
    ctx.strokeStyle = th.grid;
    ctx.globalAlpha = 0.5;
    for (let i = 1; i < PHASE_BINS; i++) {
      const x = right.x + (i / PHASE_BINS) * right.w;
      ctx.beginPath();
      ctx.moveTo(x, right.y);
      ctx.lineTo(x, right.y + right.h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.strokeStyle = th.label;
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const phase = i / steps;
      const rv = -c.K * Math.sin(TAU * phase);
      const x = right.x + phase * right.w;
      const y = yOf(right, rv);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    for (const p of c.points) {
      let phase = (p.day / c.period) % 1;
      if (phase < 0) phase += 1;
      drawPoint(right, right.x + phase * right.w, p.rv, p.sigma);
    }

    // The overlay has to be labelled wherever it is drawn. A dashed line a
    // student takes for data is worse than no line.
    //
    // Each caption is shrunk to fit the panel it belongs to rather than being
    // set at a fixed size: the Spanish strings are half again as long as the
    // English, and at 10px they ran into each other and read as one sentence.
    ctx.fillStyle = th.label;
    ctx.textAlign = 'center';
    const caption = (text, box) => {
      for (let size = 10; size >= 7; size--) {
        ctx.font = `${size}px system-ui, sans-serif`;
        if (ctx.measureText(text).width <= box.w || size === 7) break;
      }
      ctx.fillText(text, box.x + box.w / 2, h - 8);
    };
    caption(t('exoW.idealSignalOverlay'), left);
    caption(t('exoW.foldedOnTheTruePeriod'), right);
    ctx.textAlign = 'left';
  },
  readout(v) {
    const c = this.compute(v);
    const st = c.stats;
    const rows = [
      {
        get label() {
          return t('exoW.measurementsTaken');
        },
        value: `${c.n} over ${withUnit(formatNumber(c.baseline, { sig: 3 }), 'd')}`,
      },
      {
        get label() {
          return t('exoW.phaseCoverage');
        },
        value: `${c.coverage.covered} / ${c.coverage.bins} ${t('exoW.binsOfTheCycle')}`,
        emphasis: true,
      },
      {
        get label() {
          return t('exoW.scatterOfTheMeasurements');
        },
        value: withUnit(formatNumber(st.rms, { sig: 3 }), 'm/s'),
      },
      {
        get label() {
          return t('exoW.scatterExpectedFromNoise');
        },
        value: withUnit(formatNumber(c.sigma, { sig: 3 }), 'm/s'),
      },
    ];

    // Chi-square needs error bars. A noiseless run has none, and saying so is
    // better than dividing by zero and reporting infinity.
    rows.push(
      st.chi
        ? {
            get label() {
              return t('exoW.scatterVsConstantVelocity');
            },
            value: `χ²/dof = ${formatNumber(st.chi.reduced, { sig: 3 })}`,
            emphasis: true,
          }
        : {
            get label() {
              return t('exoW.scatterVsConstantVelocity');
            },
            value: t('exoW.needsAnErrorBar'),
          }
    );

    rows.push({
      get label() {
        return t('exoW.whatThatDoesNotSay');
      },
      value: t('exoW.excessScatterIsNotAPlanet'),
    });
    return rows;
  },
};

/** Every instrument this lesson uses. */
// =============================================================================
// The transit noise budget
// -----------------------------------------------------------------------------
// Why a transit that is definitely there is often not findable.
//
// A transit is a box a few hundred parts per million deep. Whether you can see
// it is a race between that depth and everything else that makes a star's
// brightness wobble, and the instructive part is that the competitors do not
// behave alike. There are THREE of them here, not two, and the middle one is
// the one this widget used to get wrong.
//
//   white              photons and readout. Independent from one integration
//                      to the next, so it falls as the square root of the
//                      total in-transit time.
//   correlated within  granulation, spot crossings, a thermal ramp over a
//   one transit        night. Wanders on hours, so binning WITHIN a transit
//                      buys nothing - but a transit three weeks later is a
//                      fresh draw, so it falls as the square root of the
//                      NUMBER OF TRANSITS.
//   persistent floor   anything phase-locked to the observation itself: a
//                      contaminating star in the aperture, a detector
//                      sensitivity pattern the target lands on every orbit, a
//                      systematic in the pipeline. Coherent across the whole
//                      campaign, so it never averages down at all.
//
// What was wrong before
// -----------------------------------------------------------------------------
// The model had two terms and treated everything correlated as permanent:
// red = hypot(stellar, instrument), used unchanged however many transits were
// observed. The accompanying explanation said correlation on transit
// timescales means more observing cannot help, and that conflates two claims.
// It is true that averaging inside one transit does not remove an hours-long
// wander. It does not follow that a second transit is no help: unless the
// noise is locked to something that repeats with the observation, each visit
// samples it afresh and N visits reduce it by root N. Only a genuinely
// persistent term survives, and that term is usually much smaller than the
// hours-correlated one.
//
// The practical difference is large. Under the old model a ground-based hot
// Jupiter sat at a floor of 2,500 ppm no matter how many nights were spent;
// under this one, thirty nights bring the same night-to-night component down
// by a factor of 5.5, and what is left is whatever is really locked to the
// observation. That is why people observe forty transits of the same planet.
//
// The assumptions, which are strong and are stated in the panel
// -----------------------------------------------------------------------------
// The middle term is treated as PERFECTLY correlated across one transit and
// PERFECTLY independent between transits. Real noise is neither: a spot group
// lives for weeks and a thermal ramp may repeat every orbit. So this is a
// two-point caricature of a continuous correlation function, chosen because it
// makes the two limits visible and arithmetic. Where the truth lies between
// them is exactly what a real analysis has to measure, and the panel says so
// rather than implying the answer is one of the two ends.
//
// The presets separate what is measured from what is assumed. Depths and
// durations are published values with their sources; the three noise terms are
// illustrative, because a real noise budget depends on the star, the aperture,
// the pipeline version and the week.
// =============================================================================

/** How many binned points to draw across the folded light curve. */
const LC_BINS = 60;

/**
 * The integration the white-noise control is quoted for.
 *
 * One hour, stated rather than implied. The control used to be labelled
 * 'ppm/hr', which reads as a rate and invites the reading that noise grows
 * with time; what is meant is the standard deviation of a point binned to one
 * hour, from which every other integration follows by a square root.
 */
const WHITE_REFERENCE_HOURS = 1;

const transitNoise = {
  id: 'transit-noise',
  get title() {
    return t('exoW.whatSwampsATransit');
  },
  get note() {
    return t('exoW.whatSwampsATransit.note');
  },
  controls: [
    {
      id: 'depth',
      get label() {
        return t('exoW.transitDepth');
      },
      unit: 'ppm',
      min: 20,
      max: 8000,
      step: 10,
      value: 6400,
      decimals: 0,
    },
    {
      // Labelled as an uncertainty for a stated integration, not as 'ppm/hr'.
      // That unit is ambiguous - it reads as a rate, as though the noise grew
      // with time - when what is meant is the scatter of a point binned to one
      // hour. Naming the integration makes the square root below say something
      // rather than assert something.
      id: 'white',
      get label() {
        return t('exoW.whitePerHour');
      },
      unit: 'ppm',
      min: 10,
      max: 4000,
      step: 10,
      value: 40,
      decimals: 0,
    },
    {
      // Named for how it behaves, not for what causes it. Granulation, spot
      // crossings and a night's thermal ramp all land here; so would a
      // detector effect that resets between visits. What they share is the
      // correlation timescale, and that is what the arithmetic cares about.
      id: 'correlated',
      get label() {
        return t('exoW.correlatedWithinTransit');
      },
      unit: 'ppm',
      min: 0,
      max: 3000,
      step: 5,
      value: 15,
      decimals: 0,
    },
    {
      id: 'floor',
      get label() {
        return t('exoW.persistentFloor');
      },
      unit: 'ppm',
      min: 0,
      max: 2000,
      step: 1,
      value: 4,
      decimals: 0,
    },
    {
      id: 'duration',
      get label() {
        return t('exoW.transitDuration');
      },
      unit: 'hr',
      min: 0.5,
      max: 14,
      step: 0.1,
      value: 4,
      decimals: 1,
    },
    {
      id: 'ntransits',
      get label() {
        return t('exoW.transitsObserved');
      },
      unit: '',
      min: 1,
      max: 800,
      step: 1,
      value: 600,
      decimals: 0,
    },
  ],
  presets: [
    // Each preset separates two kinds of number, because they have completely
    // different standing. `measured` is a published property of a real system
    // with its source; `assumed` is an illustrative noise budget, because a
    // real one depends on the star, the aperture, the pipeline version and the
    // week, and no single set of three numbers is the answer for any system.
    // The panel shows the distinction rather than presenting nine numbers as
    // though they were all measurements.
    {
      get label() {
        return t('exoW.preset.hotJupiterKepler');
      },
      // HAT-P-7 b. Depth from the Kepler light curve: 5800 +/- 150 ppm
      // (Pal et al. 2008, ApJ 680, 1450), consistent with 5900 +/- 250 ppm
      // from Morris et al. 2013 (ApJL 764, L22). The widget previously used
      // 6400 ppm, which matched neither and appears to have been derived from
      // a radius ratio rather than taken from a measured light curve.
      values: {
        depth: 5900,
        white: 40,
        correlated: 15,
        // Kepler's long-term systematic floor for a bright, quiet star is of
        // order ten parts per million; illustrative, like the two above.
        floor: 10,
        duration: 4,
        ntransits: 600,
      },
      measured: ['depth', 'duration'],
      get note() {
        return t('exoW.preset.hotJupiterKepler.note');
      },
    },
    {
      get label() {
        return t('exoW.preset.sameFromTheGround');
      },
      // The identical planet through an atmosphere. Scintillation and airmass
      // trends wander over a night, so they land in the correlated term - and
      // crucially they are a fresh draw on the next night, which is why
      // ground-based photometry of the same planet does improve with more
      // nights. What does not improve is whatever is locked to the observation
      // itself: a contaminating star in the aperture, a colour-dependent
      // extinction residual that recurs at the same hour angle.
      values: {
        depth: 5900,
        white: 900,
        correlated: 2500,
        floor: 120,
        duration: 4,
        ntransits: 3,
      },
      measured: ['depth', 'duration'],
      get note() {
        return t('exoW.preset.sameFromTheGround.note');
      },
    },
    {
      get label() {
        return t('exoW.preset.superEarthTess');
      },
      // Pi Mensae c. Rp = 2.04 +/- 0.05 R_earth (Huang et al. 2018, ApJL 868,
      // L39) about a G0V host of 1.1 R_sun, so (Rp/Rs)^2 = 289 ppm. A later
      // re-characterisation from 20-second cadence gives 2.14 R_earth and
      // therefore 318 ppm; 290 is the discovery value and the difference is a
      // good illustration of how a depth moves as a radius is refined.
      values: {
        depth: 290,
        white: 130,
        correlated: 40,
        floor: 12,
        duration: 2.9,
        ntransits: 12,
      },
      measured: ['depth', 'duration'],
      get note() {
        return t('exoW.preset.superEarthTess.note');
      },
    },
    {
      get label() {
        return t('exoW.preset.rockyTess');
      },
      // TOI-700 d. Measured TESS depth 547 ppm (Gilbert et al. 2020, AJ 160,
      // 116), for a 1.19 +/- 0.11 R_earth planet about a 0.416 R_sun M dwarf
      // over 11 sectors. Worth noting that (Rp/Rs)^2 from those radii is about
      // 690 ppm: the measured depth is shallower than the geometric ratio
      // because limb darkening and the fitted impact parameter both matter,
      // which is why the preset carries the measured number.
      values: {
        depth: 547,
        white: 800,
        correlated: 250,
        floor: 45,
        duration: 1.8,
        ntransits: 11,
      },
      measured: ['depth', 'duration'],
      get note() {
        return t('exoW.preset.rockyTess.note');
      },
    },
    {
      get label() {
        return t('exoW.preset.earthTwin');
      },
      // An Earth about a Sun. 84 ppm is exact by construction rather than
      // measured: (R_earth/R_sun)^2 = 8.4e-5. The 13-hour duration is the
      // central-transit value for a 1 AU circular orbit. Nothing like this has
      // been detected by TESS and the widget should say why rather than imply
      // it is one more sector away.
      values: {
        depth: 84,
        white: 700,
        correlated: 60,
        floor: 30,
        duration: 13,
        ntransits: 2,
      },
      measured: ['depth', 'duration'],
      get note() {
        return t('exoW.preset.earthTwin.note');
      },
    },
  ],
  compute(v) {
    const transits = Math.max(1, v.ntransits);
    const hours = Math.max(0.01, v.duration * transits);

    // Three terms, three different powers of the observing.
    //
    // White: independent integration to integration, so it falls as the square
    // root of the total in-transit time. The control is the scatter of a
    // one-hour bin, which is why the ratio below is against one hour rather
    // than against a bare number.
    const white = v.white / Math.sqrt(hours / WHITE_REFERENCE_HOURS);

    // Correlated within a transit: perfectly correlated across the transit, so
    // the transit yields one independent sample however finely it is binned -
    // and perfectly independent between transits, so N transits give N
    // samples. It falls as the square root of the number of TRANSITS, not of
    // the time. This is the term the previous model held fixed.
    const correlated = v.correlated / Math.sqrt(transits);

    // Persistent: coherent across the campaign, so averaging does nothing to
    // it at all. This is the only genuine floor.
    const floor = v.floor;

    const total = Math.hypot(white, correlated, floor);
    return {
      hours,
      transits,
      white,
      whitePerReference: v.white,
      referenceHours: WHITE_REFERENCE_HOURS,
      correlated,
      correlatedPerTransit: v.correlated,
      floor,
      total,
      depth: v.depth,
      // Not called significance, and not turned into a probability. It is the
      // depth measured in units of its own uncertainty, which is a description
      // of the measurement rather than a claim about a planet.
      ratio: total > 0 ? v.depth / total : Infinity,
      // What is left after infinite observing: the persistent term alone, since
      // both of the others go to zero. The number that says whether patience
      // can ever work, and under the old model it was wrong by however much of
      // the budget was merely hours-correlated.
      ceiling: floor > 0 ? v.depth / floor : Infinity,
      // How much of the present total would survive unlimited observing. Near
      // 1 means the campaign is already floor-limited; near 0 means more
      // transits are still buying precision.
      floorShare: total > 0 ? floor / total : 0,
    };
  },
  readout(v) {
    const c = this.compute(v);
    return [
      {
        get label() {
          return t('exoW.readout.depthOverNoise');
        },
        value: formatNumber(c.ratio, { sig: 3 }),
        emphasis: true,
      },
      {
        get label() {
          return t('exoW.readout.totalNoise');
        },
        value: withUnit(formatNumber(c.total, { sig: 3 }), 'ppm'),
      },
      {
        get label() {
          return t('exoW.readout.photonAfterAveraging');
        },
        value: withUnit(formatNumber(c.white, { sig: 3 }), 'ppm'),
      },
      {
        get label() {
          return t('exoW.readout.correlatedAfterTransits', {
            n: formatNumber(c.transits, { sig: 3 }),
          });
        },
        value: withUnit(formatNumber(c.correlated, { sig: 3 }), 'ppm'),
      },
      {
        // Named as what survives rather than as 'the floor', because the term
        // above is also a floor in the sense of not binning away - it just is
        // not a permanent one, and running the two together is the error this
        // widget used to make.
        get label() {
          return t('exoW.readout.persistentFloor');
        },
        value: withUnit(formatNumber(c.floor, { sig: 3 }), 'ppm'),
      },
      {
        get label() {
          return t('exoW.readout.inTransitHours');
        },
        value: withUnit(formatNumber(c.hours, { sig: 3 }), 'hr'),
      },
      {
        // What unlimited observing would reach. Both the white term and the
        // within-transit term go to zero, so only the persistent one is left -
        // which is a far smaller number than the old model's, because that one
        // counted the hours-correlated term as permanent too.
        get label() {
          return t('exoW.readout.ceiling');
        },
        value: Number.isFinite(c.ceiling)
          ? formatNumber(c.ceiling, { sig: 3 })
          : '\u221e',
      },
    ];
  },
  draw(canvas, v) {
    const { ctx, w, h } = surface(canvas, responsiveHeight(260, 190));
    const th = chartColors();
    const c = this.compute(v);

    const gap = 26;
    const boxW = (w - 78 - gap) / 2;
    const left = { x: 52, y: 16, w: boxW, h: h - 66 };
    const right = { x: 52 + boxW + gap, y: 16, w: boxW, h: h - 66 };

    // --- Left: the budget, as bars against the depth ---
    drawFrame(ctx, left, { x: t('exoW.ppmAxis'), y: '' }, th);
    const terms = [
      { key: 'photon', value: c.white, colour: th.accent },
      { key: 'correlated', value: c.correlated, colour: '#f2a65a' },
      { key: 'floor', value: c.floor, colour: '#c98ae0' },
      { key: 'total', value: c.total, colour: th.ink },
    ];
    const scaleMax = Math.max(c.depth, ...terms.map(x => x.value)) * 1.15 || 1;
    const rowH = (left.h - 12) / (terms.length + 1);
    ctx.font = '10px ui-monospace, monospace';

    terms.forEach((term, i) => {
      const y = left.y + 8 + i * rowH;
      const barW = (term.value / scaleMax) * (left.w - 76);
      ctx.fillStyle = term.colour;
      ctx.fillRect(left.x + 70, y, Math.max(1, barW), rowH * 0.55);
      ctx.fillStyle = th.muted;
      ctx.textAlign = 'right';
      ctx.fillText(t(`exoW.noise.${term.key}`), left.x + 65, y + rowH * 0.45);
      ctx.textAlign = 'left';
      ctx.fillText(
        formatNumber(term.value, { sig: 2 }),
        left.x + 74 + Math.max(1, barW),
        y + rowH * 0.45
      );
    });

    // The depth, as a line across all of them. Whether the bars reach it is
    // the entire question, and a line is the fastest way to read that.
    const depthX = left.x + 70 + (c.depth / scaleMax) * (left.w - 76);
    ctx.strokeStyle = th.good || '#8de08a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(depthX, left.y + 4);
    ctx.lineTo(depthX, left.y + left.h - 4);
    ctx.stroke();
    ctx.fillStyle = th.good || '#8de08a';
    ctx.textAlign = 'center';
    ctx.fillText(t('exoW.depthMarker'), depthX, left.y + left.h + 12);

    // --- Right: what the folded light curve actually looks like ---
    drawFrame(ctx, right, { x: t('exoW.phaseAxis'), y: '' }, th);
    // Half the plot window is transit, so the box is visible if anything is.
    const inTransit = i => i >= LC_BINS * 0.35 && i < LC_BINS * 0.65;
    const span = Math.max(c.depth, c.total * 3) * 1.6 || 1;
    const yOf = ppm =>
      right.y + right.h * 0.35 + (ppm / span) * (right.h * 0.5);

    ctx.strokeStyle = th.grid;
    ctx.beginPath();
    ctx.moveTo(right.x, yOf(0));
    ctx.lineTo(right.x + right.w, yOf(0));
    ctx.stroke();

    // The noise on each binned point is the total, because each bin holds the
    // same share of the observing time as the budget assumed.
    const seed = Math.round(v.depth + v.white * 7 + v.ntransits * 13);
    ctx.fillStyle = th.ink;
    for (let i = 0; i < LC_BINS; i++) {
      const x = right.x + 3 + ((right.w - 6) * i) / (LC_BINS - 1);
      const signal = inTransit(i) ? c.depth : 0;
      const y = yOf(signal + gaussianAt(seed, i) * c.total);
      ctx.beginPath();
      ctx.arc(x, y, 1.7, 0, TAU);
      ctx.fill();
    }

    // The truth, so a student can see where the box was even when the points
    // do not show it. Dashed and labelled, exactly like the RV widget's.
    ctx.strokeStyle = th.good || '#8de08a';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < LC_BINS; i++) {
      const x = right.x + 3 + ((right.w - 6) * i) / (LC_BINS - 1);
      const y = yOf(inTransit(i) ? c.depth : 0);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = th.muted;
    ctx.textAlign = 'left';
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillText(
      t('exoW.depthOverNoise', { ratio: formatNumber(c.ratio, { sig: 2 }) }),
      right.x + 4,
      right.y + right.h + 12
    );
  },
};

export const EXOPLANET_WIDGETS = [
  reflexMotion,
  rvObserver,
  rvMass,
  rvInclination,
  astrometrySignature,
  methodComparison,
  planetCharacterization,
  surveySchedule,
  transitNoise,
];
