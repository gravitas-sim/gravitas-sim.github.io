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
import { HD209458, SUN_JUPITER } from './data/exoplanetSystems.js';
import { formatNumber, withUnit } from './format.js';
import { chartColors } from './observationChart.js';
import { surface, responsiveHeight } from './widgetCanvas.js';

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
  title: 'Who is actually moving?',
  note: 'The star and the planet both go round the same point. Turn the magnification up to see the star do it.',
  controls: [
    {
      id: 'mp',
      label: 'Planet mass',
      unit: 'M_J',
      min: 0.003,
      max: 12,
      step: 0.001,
      value: 0.69,
      decimals: 3,
    },
    {
      id: 'a',
      label: 'Orbit size',
      unit: 'AU',
      min: 0.02,
      max: 6,
      step: 0.01,
      value: 0.05,
      decimals: 2,
    },
    {
      id: 'mag',
      label: 'Stellar wobble shown',
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
      label: 'Jupiter, at Jupiter’s distance',
      values: { mp: 1, a: 5.2, mag: 60 },
      note: 'The Sun really does this. Its reflex orbit is about one solar radius across, and it takes twelve years to go round.',
    },
    {
      label: 'An Earth',
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
        label: 'Star’s own orbit',
        value: withUnit(formatNumber(c.aStar, { sig: 3 }), 'AU'),
        emphasis: true,
      },
      {
        label: 'Planet’s orbit',
        value: withUnit(formatNumber(c.aPlanet, { sig: 3 }), 'AU'),
      },
      {
        label: 'Planet’s orbit is bigger by',
        value: `${formatNumber(c.ratio, { sig: 3 })}×`,
      },
      {
        label: 'Both go round once every',
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
  title: 'Toward us, away from us',
  note: 'The dot on the ring is the star. The graph is the only part of its motion a spectrograph can see: the part along our line of sight.',
  controls: [
    {
      id: 'mp',
      label: 'Planet mass',
      unit: 'M_J',
      min: 0.01,
      max: 10,
      step: 0.01,
      value: 0.69,
      decimals: 2,
    },
    {
      id: 'inc',
      label: 'Inclination',
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
        label: 'Radial velocity now',
        value: `${rv >= 0 ? '+' : '−'}${withUnit(formatNumber(Math.abs(rv)), 'm/s')}`,
      },
      {
        label: 'Which way',
        value:
          Math.abs(rv) < 0.5
            ? 'across our view'
            : rv > 0
              ? 'AWAY FROM US'
              : 'TOWARD US',
        emphasis: true,
      },
      {
        label: 'Semi-amplitude K',
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
  title: 'What makes the wobble bigger?',
  note: 'One thing changes at a time. The star, the period and the viewing angle are all held still.',
  controls: [
    {
      id: 'mp',
      label: 'Planet mass',
      unit: 'M_J',
      min: 0.01,
      max: 10,
      step: 0.01,
      value: 0.69,
      decimals: 2,
    },
  ],
  presets: [
    { label: 'An Earth', values: { mp: 1 / EARTH_PER_JUPITER } },
    { label: 'A Neptune', values: { mp: 0.054 } },
    { label: 'HD 209458 b', values: { mp: 0.69 } },
    { label: 'A heavy Jupiter', values: { mp: 5 } },
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
        label: 'Planet mass',
        value: `${withUnit(formatNumber(v.mp), 'M_J')} (${withUnit(formatNumber(earths, { sig: 2 }), 'M⊕')})`,
      },
      {
        label: 'Semi-amplitude K',
        value: withUnit(formatNumber(c.K), 'm/s'),
        emphasis: true,
      },
      {
        label: 'Double the mass and K',
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
  title: 'The same planet, tilted',
  note: 'The planet does not change. Only our viewing angle does. Watch what happens to the mass radial velocity reports.',
  controls: [
    {
      id: 'inc',
      label: 'Inclination',
      unit: '°',
      min: 0,
      max: 90,
      step: 1,
      value: 90,
      decimals: 0,
    },
    {
      id: 'mp',
      label: 'True planet mass',
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
      label: 'Edge-on, 90°',
      values: { inc: 90 },
      note: 'A transiting system is close to this, which is what makes its mass a mass rather than a lower limit.',
    },
    { label: '60°', values: { inc: 60 } },
    { label: '30°', values: { inc: 30 } },
    {
      label: 'Face-on, 5°',
      values: { inc: 5 },
      note: 'Almost no radial-velocity signal at all. The planet is still there.',
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
      { label: 'True planet mass', value: withUnit(formatNumber(v.mp), 'M_J') },
      {
        label: 'K we would measure',
        value: withUnit(formatNumber(c.K), 'm/s'),
      },
      {
        label: 'Mass RV alone reports',
        value: withUnit(formatNumber(c.inferred), 'M_J'),
        emphasis: true,
      },
      {
        label: 'That is the true mass times',
        value: `sin i = ${formatNumber(c.sinI, { sig: 3 })}`,
      },
      {
        label: 'So radial velocity gives',
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
  title: 'The wobble across the sky',
  note: 'Astrometry measures where the star is, not how fast it is coming at us. Nothing here is a picture of the planet.',
  controls: [
    {
      id: 'mp',
      label: 'Planet mass',
      unit: 'M_J',
      min: 0.01,
      max: 12,
      step: 0.01,
      value: 1,
      decimals: 2,
    },
    {
      id: 'a',
      label: 'Orbit size',
      unit: 'AU',
      min: 0.02,
      max: 20,
      step: 0.01,
      value: 5.2,
      decimals: 2,
    },
    {
      id: 'd',
      label: 'Distance',
      unit: 'pc',
      min: 1,
      max: 200,
      step: 1,
      value: 10,
      decimals: 0,
    },
    {
      id: 'inc',
      label: 'Inclination',
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
      note: 'A textbook radial-velocity target and a hopeless astrometric one: close in, and nearly fifty parsecs away.',
    },
    {
      label: 'Sun and Jupiter at 10 pc',
      values: {
        mp: 1,
        a: SUN_JUPITER.planet.semiMajorAU,
        d: 10,
        inc: 45,
      },
      note: 'The same method, a wide orbit and a near system: hundreds of times easier.',
    },
    {
      label: 'Twice as far away',
      values: { mp: 1, a: 5.2, d: 20, inc: 45 },
      note: 'The star’s orbit has not changed at all. Only the angle it subtends has.',
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
        label: 'Star’s reflex orbit',
        value: withUnit(formatNumber(c.aStar, { sig: 3 }), 'AU'),
      },
      {
        label: 'Angular signature',
        value: `${formatNumber(c.unit.value, { sig: 3 })} ${c.unit.unit}`,
        emphasis: true,
      },
      {
        label: 'Orbital period',
        value: withUnit(formatNumber(c.period / 365.25, { sig: 3 }), 'years'),
      },
      {
        label: 'Distance changes',
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
  title: 'Three methods, one system',
  note: 'Tilt the same planet and watch which measurements survive. No method wins everywhere.',
  controls: [
    {
      id: 'inc',
      label: 'Inclination',
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
    const t = chartColors();
    const c = this.compute(v);
    const rows = [
      {
        name: 'Transit',
        gives: 'radius',
        frac: c.transits ? 1 : 0,
        text: c.transits ? 'transits' : 'no transit',
      },
      {
        name: 'Radial velocity',
        gives: 'mass × sin i',
        frac: c.rvFraction,
        text: `${Math.round(c.rvFraction * 100)}% of full`,
      },
      {
        name: 'Astrometry',
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
      ctx.fillStyle = t.label;
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(row.name, 8, y + 12);
      ctx.fillStyle = t.tick;
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillText(`→ ${row.gives}`, 8, y + 24);

      ctx.fillStyle = t.grid;
      ctx.fillRect(bx, y, bw, 15);
      ctx.fillStyle = row.frac > 0.02 ? t.accent : t.warm;
      ctx.fillRect(bx, y, Math.max(2, bw * row.frac), 15);
      ctx.fillStyle = t.tick;
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillText(row.text, bx + bw + 6, y + 12);
    });
  },
  readout(v) {
    const c = this.compute(v);
    return [
      {
        label: 'Transit',
        value: c.transits
          ? 'yes: gives radius and pins sin i near 1'
          : 'none at this tilt',
      },
      {
        label: 'Radial velocity',
        value: `${formatNumber(c.rvFraction * 100, { sig: 3 })}% of the edge-on signal`,
      },
      {
        label: 'Astrometry',
        value: 'full signal at every tilt, different shape',
        emphasis: true,
      },
      {
        label: 'Together',
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
  title: 'What do we actually know?',
  note: 'Each row is one observation and what it buys. The last two rows need the ones above them.',
  controls: [
    {
      id: 'rp',
      label: 'Radius, from the transit',
      unit: 'R_J',
      min: 0.05,
      max: 2.5,
      step: 0.01,
      value: HD209458.planet.radiusJupiter,
      decimals: 2,
    },
    {
      id: 'mp',
      label: 'Mass, from radial velocity',
      unit: 'M_J',
      min: 0.002,
      max: 5,
      step: 0.001,
      value: HD209458.planet.massJupiter,
      decimals: 3,
    },
    {
      id: 'a',
      label: 'Orbit size',
      unit: 'AU',
      min: 0.01,
      max: 5,
      step: 0.001,
      value: HD209458.planet.semiMajorAU,
      decimals: 3,
    },
    {
      id: 'lum',
      label: 'Star’s luminosity',
      unit: 'L☉',
      min: 0.001,
      max: 10,
      step: 0.001,
      value: HD209458.star.luminositySolar,
      decimals: 3,
    },
    {
      id: 'teff',
      label: 'Star’s temperature',
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
      note: 'The planet this lesson measured. Large, light, and far too close to its star for the zone.',
    },
    {
      label: 'Planet A: a rocky candidate',
      values: { rp: 0.0981, mp: 0.0044, a: 1.02, lum: 0.6, teff: 5400 },
      note: 'A little larger than Earth and a little heavier, at a density much like Earth’s, in the modeled zone of a slightly cooler star.',
    },
    {
      label: 'Planet B: puffy',
      values: { rp: 0.223, mp: 0.0189, a: 0.95, lum: 0.6, teff: 5400 },
      note: 'Two and a half Earth radii but only six Earth masses. The same zone, a very different world: too light for its size to be rock.',
    },
    {
      label: 'Planet C: rocky, too hot',
      values: { rp: 0.0937, mp: 0.0041, a: 0.14, lum: 0.6, teff: 5400 },
      note: 'A rocky density, and far too close to its star for the zone. Composition alone was never the whole question.',
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
        label: 'Bulk density',
        value: `${withUnit(formatNumber(c.density.gramsPerCm3, { sig: 3 }), 'g/cm³')} (${formatNumber(c.density.relativeToEarth, { sig: 2 })}× Earth)`,
        emphasis: true,
      },
      { label: 'Which means', value: composition },
      {
        label: 'Starlight received',
        value: `${formatNumber(c.flux, { sig: 3 })} × what Earth gets`,
      },
      {
        label: 'Modeled habitable zone',
        value: `${formatNumber(c.bounds.innerAU, { sig: 3 })} to ${withUnit(formatNumber(c.bounds.outerAU, { sig: 3 }), 'AU')}`,
      },
      {
        label: 'This planet is',
        value: c.status.label,
        emphasis: true,
      },
    ];
  },
};

/** Every instrument this lesson uses. */
export const EXOPLANET_WIDGETS = [
  reflexMotion,
  rvObserver,
  rvMass,
  rvInclination,
  astrometrySignature,
  methodComparison,
  planetCharacterization,
];
