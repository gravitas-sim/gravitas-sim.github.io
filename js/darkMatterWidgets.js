// =============================================================================
// Dark matter widgets: the instruments for "The Missing Mass"
// -----------------------------------------------------------------------------
// This lesson used to have none. It ran entirely on the live Rotation Curve
// panel, which is the right instrument for the argument and the wrong one for
// building up to it: a student met a finished rotation curve before they had
// ever made one, and the two inferences the whole lesson rests on -
//
//   the slope of a rotation curve tells you where the mass is
//   a flat curve means the enclosed mass keeps growing
//
// - were prose to be agreed with rather than things to be discovered. Every
// panel here exists to turn one of those sentences into something a student
// does with their hands.
//
// The set, in the order the lesson uses them:
//
//   dm-shapes    put mass somewhere, see the curve it makes
//   dm-enclosed  a curve and its enclosed mass, side by side, with a scrubber
//   dm-fit       fit a real galaxy's curve with a disc and a halo. The centre
//                of the lesson, and the actual research activity
//   dm-flyby     fly a star through a halo and switch the halo off mid-orbit
//   dm-virial    Zwicky's arithmetic, with the classic mistakes reachable
//   dm-budget    where the mass of the universe is, to scale
//
// All the physics is in js/darkMatter.js, which is pure and tested. Nothing in
// this file computes a rotation curve, a Bessel function or a virial mass for
// itself, so a number a student reads here is the same number the validation
// suite checks.
//
// On the "observed" curve in dm-fit
// -----------------------------------------------------------------------------
// It is synthetic, and the panel says so. It is built from NGC 3198's published
// structural parameters - a 2.6 kpc disc scale length and a 150 km/s asymptotic
// speed, measured out to about 30 kpc - rather than transcribed from anyone's
// data table, with a fixed scatter of a few km/s so it reads as measurement. The
// consequence is that the exercise has an exact right answer, which is what makes
// it a fitting game rather than a shrug, and no number is attributed to a paper
// that did not publish it.
// =============================================================================

import { surface, responsiveHeight, MONO } from './widgetCanvas.js';
import { scientific, decimal, withUnit } from './format.js';
import {
  G_GALACTIC,
  pointMassSpeed,
  uniformSphereSpeed,
  exponentialDiscSpeed,
  haloCircularSpeed,
  galaxyCurveAt,
  haloEnclosedMass,
  enclosedMassFromSpeed,
  curveResidual,
  virialMass,
  losToMeanSquare,
} from './darkMatter.js';

// The same fixed dark palette the black hole and tidal panels use, and for the
// same reason: these are pictures of space and plots over it, and theme-coloured
// ink on them was unreadable in the two light themes.
const SKY = '#080b14';
const INK = '#e9edf7';
const MUTED = '#9aa3b5';
const GRID = '#232a3a';

// One colour per component, used identically in every panel in this file. A
// student who learns that purple is the halo in one instrument should not have
// to relearn it in the next.
const C_BULGE = '#ffd37a';
const C_DISC = '#8fd4ff';
const C_HALO = '#c08cff';
const C_TOTAL = '#8de08a';
const C_VISIBLE = '#ffb057';
const C_DATA = '#f2748c';
const WARN = '#ff8f6b';

/** Ground the panel in a dark sky, whatever theme the page is wearing. */
function sky(ctx, w, h) {
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, w, h);
}

/** Text with a dark outline, so it stays readable over anything. */
function halo(ctx, text, x, y) {
  const fill = ctx.fillStyle;
  ctx.strokeStyle = 'rgba(8,11,20,0.92)';
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/**
 * A plot box with axes, ticks and labels, and the mapping into it.
 *
 * Returns the two coordinate transforms rather than drawing anything with them,
 * so a caller can plot points, lines and shaded bands into the same frame
 * without any of them repeating the arithmetic.
 *
 * @param {CanvasRenderingContext2D} ctx - Target
 * @param {Object} box - {x, y, w, h} in CSS pixels
 * @param {Object} range - {xMax, yMax, xLabel, yLabel}
 * @returns {{X: Function, Y: Function}} Data-to-pixel transforms
 */
function frame(ctx, box, range) {
  const { x, y, w, h } = box;
  const {
    xMax,
    yMax,
    xLabel = '',
    yLabel = '',
    xTicks = 6,
    yTicks = 4,
  } = range;
  const X = v => x + (Math.max(0, Math.min(xMax, v)) / xMax) * w;
  const Y = v => y + h - (Math.max(0, Math.min(yMax, v)) / yMax) * h;

  ctx.font = `10px ${MONO}`;
  ctx.lineWidth = 1;

  // Gridlines first, so everything else draws over them.
  ctx.strokeStyle = GRID;
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= xTicks; i++) {
    const v = (xMax * i) / xTicks;
    const px = X(v);
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px, y + h);
    ctx.stroke();
    if (i) ctx.fillText(String(Math.round(v)), px, y + h + 4);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= yTicks; i++) {
    const v = (yMax * i) / yTicks;
    const py = Y(v);
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(x + w, py);
    ctx.stroke();
    if (i) ctx.fillText(String(Math.round(v)), x - 5, py);
  }

  // Axis lines, brighter than the grid.
  ctx.strokeStyle = MUTED;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.stroke();

  ctx.fillStyle = MUTED;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  if (xLabel) ctx.fillText(xLabel, x + w / 2, y + h + 17);
  if (yLabel) {
    ctx.save();
    ctx.translate(x - 32, y + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'bottom';
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }
  return { X, Y };
}

/**
 * Draw a curve from a function of radius.
 * @param {CanvasRenderingContext2D} ctx - Target
 * @param {Object} t - Transforms from frame()
 * @param {number} rMax - Outer radius
 * @param {Function} fn - r -> value
 * @param {string} color - Stroke
 * @param {Object} [opts] - {width, dash, rMin}
 */
function curve(ctx, t, rMax, fn, color, opts = {}) {
  ctx.strokeStyle = color;
  ctx.lineWidth = opts.width ?? 2;
  ctx.setLineDash(opts.dash || []);
  ctx.beginPath();
  const n = 140;
  // Where to start drawing. A point-mass component diverges at the origin, so a
  // curve drawn from r = 0 puts a spike against the left axis that looks like a
  // rendering fault and is really the model being asked about a radius it does
  // not describe: a galaxy's bulge is not a point, and no rotation curve is
  // measured inside it. Panels whose innermost data sits at 1 kpc start at 0.5.
  const rMin = opts.rMin ?? (rMax * 0.02) / n;
  let started = false;
  for (let i = 0; i <= n; i++) {
    const r = rMin + ((rMax - rMin) * i) / n;
    const v = fn(r);
    if (!Number.isFinite(v)) continue;
    const px = t.X(r);
    const py = t.Y(v);
    if (!started) {
      ctx.moveTo(px, py);
      started = true;
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * A bar's value, written inside it when it fits and beside it when it does not.
 *
 * The whole point of the cluster panel is that one bar is eleven times longer
 * than the other, so the short one is always too narrow to hold its own label.
 * Written inside regardless, it spilled over the end in dark ink on a dark
 * background and became unreadable at exactly the moment it mattered most.
 *
 * @param {CanvasRenderingContext2D} ctx - Target
 * @param {string} text - The label
 * @param {number} x - Bar left edge
 * @param {number} y - Bar top edge
 * @param {number} barW - Bar width
 * @param {number} barH - Bar height
 * @param {string} inside - Ink to use when the label fits inside
 */
function barLabel(ctx, text, x, y, barW, barH, inside = '#0b0f18') {
  ctx.font = `bold 10px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const needed = ctx.measureText(text).width + 12;
  if (needed <= barW) {
    ctx.fillStyle = inside;
    ctx.fillText(text, x + 6, y + barH / 2);
  } else {
    ctx.fillStyle = INK;
    halo(ctx, text, x + barW + 6, y + barH / 2);
  }
}

/** A small colour key entry. */
function key(ctx, x, y, color, label, dashed = false) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.setLineDash(dashed ? [4, 3] : []);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 16, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = MUTED;
  ctx.font = `10px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 21, y);
  return ctx.measureText(label).width + 42;
}

/**
 * A mass, written the way it would be said out loud where that is possible and
 * in scientific notation where it is not.
 *
 * Cluster masses run to 10^15 solar masses and galaxy masses to 10^10, so this
 * has to span five decades without ever printing something like "1.63e+3 ×
 * 10¹²", which is what a single fixed unit produces at the top of the range.
 * The typesetting comes from js/format.js rather than from a local template, so
 * the superscripts and the non-breaking spaces match every other readout in the
 * application.
 *
 * @param {number} solar - Mass in solar masses
 * @returns {string} A formatted mass
 */
function massLabel(solar) {
  if (!Number.isFinite(solar) || solar <= 0) return '—';
  if (solar >= 1e12) return withUnit(scientific(solar, 3, true), 'M☉');
  // Plain decimals inside the range where the word carries the magnitude:
  // "543 billion" reads, and "5.43 × 10² billion" does not.
  if (solar >= 1e9) return withUnit(decimal(solar / 1e9, 3), 'billion M☉');
  if (solar >= 1e6) return withUnit(decimal(solar / 1e6, 3), 'million M☉');
  return withUnit(Math.round(solar).toLocaleString('en-US'), 'M☉');
}

/**
 * A mass in units of 10^10 solar masses, the unit galaxy discs are quoted in.
 *
 * Fixed rather than adaptive on purpose: every mass in the fitting instrument is
 * of this order, and a student comparing a disc with a halo should be reading two
 * numbers in the same unit rather than converting between them.
 *
 * @param {number} solar - Mass in solar masses
 * @returns {string} e.g. "3.35 × 10¹⁰ M☉"
 */
const e10 = solar =>
  Number.isFinite(solar)
    ? withUnit(`${(solar / 1e10).toFixed(2)}\u00a0×\u00a010¹⁰`, 'M☉')
    : '—';

// =============================================================================
// 1. dm-shapes - put the mass somewhere and see what curve it makes
// =============================================================================
//
// The scaffolding step. Before a student is asked what a flat curve implies,
// they should have seen for themselves that the shape of a rotation curve is a
// statement about where the mass is and nothing else. Four distributions, the
// same total mass in each, and the curves come out completely different.

const SHAPE_KINDS = [
  { key: 'point', label: 'All in the middle' },
  { key: 'sphere', label: 'Uniform ball' },
  { key: 'disc', label: 'Exponential disc' },
  { key: 'halo', label: 'Halo (mass keeps growing)' },
];

const SHAPES = {
  id: 'dm-shapes',
  title: 'Where the mass is, and the curve it makes',
  note: 'The same total mass in every case, arranged differently. The picture on the left is where the mass is; the plot on the right is the orbital speed it produces. Only one of these four shapes gives a flat curve.',
  controls: [
    {
      id: 'kind',
      label: 'Mass distribution',
      min: 0,
      max: 3,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => SHAPE_KINDS[Math.round(v)]?.label ?? '—',
    },
    {
      id: 'mass',
      label: 'Total mass inside 30 kpc',
      unit: '× 10¹⁰ M☉',
      min: 1,
      max: 20,
      step: 0.5,
      value: 8,
      decimals: 1,
    },
    {
      id: 'size',
      label: 'How spread out it is',
      unit: 'kpc',
      min: 1,
      max: 20,
      step: 0.5,
      value: 4,
      decimals: 1,
    },
  ],
  presets: [
    {
      label: 'Solar System',
      values: { kind: 0, mass: 8, size: 4 },
      note: 'Everything in the middle. This is the Sun and its planets, and it is the case where adding up the light gives the right answer.',
    },
    {
      label: 'Uniform ball',
      values: { kind: 1, mass: 8, size: 8 },
      note: 'Speed rises inside the ball and falls outside it. The peak is exactly where the mass runs out, which is a useful thing to know how to read.',
    },
    {
      label: 'Spiral disc',
      values: { kind: 2, mass: 8, size: 4 },
      note: 'A real stellar disc. It rises, peaks at about 2.2 scale lengths, and then falls away. Still not flat.',
    },
    {
      label: 'What galaxies do',
      values: { kind: 3, mass: 8, size: 2.5 },
      note: 'Flat. The only way to get this shape is for the enclosed mass to keep growing all the way out, long after the light has stopped.',
    },
  ],
  compute(v) {
    const kind = SHAPE_KINDS[Math.round(v.kind)]?.key ?? 'point';
    const mass = v.mass * 1e10;
    const size = v.size;
    const R_MAX = 30;

    // Each distribution is normalised to hold the same mass inside 30 kpc, so
    // the comparison is about arrangement and not about amount.
    let speedAt;
    if (kind === 'point') {
      speedAt = r => pointMassSpeed(r, mass);
    } else if (kind === 'sphere') {
      speedAt = r => uniformSphereSpeed(r, mass, size);
    } else if (kind === 'disc') {
      // Scale the total so that the mass inside 30 kpc is the mass asked for.
      const x = R_MAX / size;
      const inside = 1 - (1 + x) * Math.exp(-x);
      speedAt = r =>
        exponentialDiscSpeed(r, mass / Math.max(inside, 1e-6), size);
    } else {
      // Solve for the v_flat that puts the requested mass inside 30 kpc.
      const unit = haloEnclosedMass(
        R_MAX,
        { vFlat: 1, coreRadius: size },
        G_GALACTIC
      );
      const vFlat = unit > 0 ? Math.sqrt(mass / unit) : 0;
      speedAt = r => haloCircularSpeed(r, vFlat, size);
    }

    // Fit an exponent over the outer half, which is where a real curve is read.
    const rA = 0.55 * R_MAX;
    const rB = R_MAX;
    const vA = speedAt(rA);
    const vB = speedAt(rB);
    const slope =
      vA > 0 && vB > 0 ? Math.log(vB / vA) / Math.log(rB / rA) : NaN;

    return {
      kind,
      mass,
      size,
      speedAt,
      slope,
      rMax: R_MAX,
      vAt30: speedAt(30),
    };
  },
  readout(v) {
    const f = SHAPES.compute(v);
    // The bands are comparative on purpose. A pseudo-isothermal halo approaches
    // its asymptote from below, as sqrt(1 - pi/2x), so over a finite outer range
    // it still climbs by about pi/4x - roughly +0.1 at the radii plotted here.
    // That is the profile and not an error, and calling it "rising" would teach a
    // student to reject the very shape the lesson is about. What matters is the
    // distance from the Keplerian -0.5, which is a factor of several.
    const shape = !Number.isFinite(f.slope)
      ? 'not defined'
      : f.slope < -0.35
        ? 'falling, Keplerian'
        : f.slope < -0.15
          ? 'falling'
          : f.slope <= 0.2
            ? 'FLAT'
            : 'rising';
    return [
      { label: 'Speed at 30 kpc', value: `${f.vAt30.toFixed(0)} km/s` },
      {
        label: 'Outer slope (v ∝ rⁿ)',
        value: Number.isFinite(f.slope) ? f.slope.toFixed(2) : '—',
      },
      { label: 'Shape out there', value: shape, emphasis: true },
      {
        label: 'Mass inside 30 kpc',
        value: e10(f.mass),
      },
    ];
  },
  draw(canvas, v) {
    const H = responsiveHeight(300, 240);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);
    const f = SHAPES.compute(v);

    // Left: a picture of where the mass is. Right: the curve.
    const picW = Math.min(150, w * 0.34);
    const cx = picW / 2;
    const cy = H / 2 - 8;
    const picR = Math.min(picW, H) * 0.36;

    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = MUTED;
    halo(ctx, 'where the mass is', cx, 8);

    // A faint reference circle at 30 kpc in every case, so the four pictures
    // are drawn to the same scale.
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(cx, cy, picR, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    const sizeFrac = Math.min(1, f.size / 30);
    if (f.kind === 'point') {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, picR * 0.3);
      g.addColorStop(0, C_BULGE);
      g.addColorStop(1, 'rgba(255,211,122,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, picR * 0.3, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = C_BULGE;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
      ctx.fill();
    } else if (f.kind === 'sphere') {
      ctx.fillStyle = 'rgba(255,211,122,0.42)';
      ctx.beginPath();
      ctx.arc(cx, cy, picR * sizeFrac, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = C_BULGE;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    } else if (f.kind === 'disc') {
      // Edge-on, so the flatness of a disc is visible as flatness.
      const rd = picR * sizeFrac;
      for (let i = 12; i >= 1; i--) {
        const rr = (i / 12) * picR;
        ctx.fillStyle = `rgba(143,212,255,${0.42 * Math.exp(-rr / Math.max(rd, 1))})`;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rr, Math.max(2, rr * 0.16), 0, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.strokeStyle = C_DISC;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(
        cx,
        cy,
        picR * 0.92,
        Math.max(2, picR * 0.15),
        0,
        0,
        2 * Math.PI
      );
      ctx.stroke();
    } else {
      // A halo has no edge. Draw it as something that keeps going past the
      // reference circle, because that is the entire property being shown.
      for (let i = 14; i >= 1; i--) {
        const rr = (i / 14) * picR * 1.25;
        ctx.fillStyle = `rgba(192,140,255,${0.1 + 0.13 / (1 + (rr / (picR * sizeFrac)) ** 2)})`;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.fillStyle = C_HALO;
      ctx.textBaseline = 'bottom';
      halo(ctx, 'no edge', cx, H - 6);
    }

    const box = {
      x: picW + 44,
      y: 22,
      w: w - picW - 60,
      h: H - 66,
    };
    if (box.w < 60) return;
    const t = frame(ctx, box, {
      xMax: 30,
      yMax: 320,
      xLabel: 'radius  (kpc)',
      yLabel: 'speed  (km/s)',
    });

    // A flat reference line, so "flat" is a thing the eye can check against
    // rather than a thing it has to judge.
    ctx.strokeStyle = 'rgba(141,224,138,0.28)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    const flatV = f.speedAt(30);
    ctx.beginPath();
    ctx.moveTo(t.X(0), t.Y(flatV));
    ctx.lineTo(t.X(30), t.Y(flatV));
    ctx.stroke();
    ctx.setLineDash([]);

    const colour =
      f.kind === 'halo' ? C_HALO : f.kind === 'disc' ? C_DISC : C_BULGE;
    curve(ctx, t, 30, f.speedAt, colour, { width: 2.6 });

    ctx.fillStyle = MUTED;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    halo(
      ctx,
      SHAPE_KINDS[Math.round(v.kind)]?.label ?? '',
      box.x + 6,
      box.y + 4
    );
  },
};

// =============================================================================
// 2. dm-enclosed - the curve and the mass it implies, together
// =============================================================================
//
// The lesson's central inference, made mechanical. Rearranging v = sqrt(GM/r)
// into M = v^2 r / G is one line of algebra that a student can follow and still
// not feel. Putting the curve above the enclosed mass and giving them a radius
// to drag makes the consequence unavoidable: on the Keplerian curve the lower
// plot goes flat, and on the flat curve the lower plot is a straight line
// through the origin.

const ENCLOSED_CURVES = [
  { key: 'kepler', label: 'Falling (all mass in the middle)' },
  { key: 'flat', label: 'Flat (what galaxies do)' },
  { key: 'galaxy', label: 'A real galaxy: disc + halo' },
];

const ENCLOSED = {
  id: 'dm-enclosed',
  title: 'What the speed tells you about the mass',
  note: 'Top: orbital speed against radius. Bottom: the mass that must lie inside that radius, which is the same measurement rearranged — M(&lt;r) = v²·r/G. Drag the radius marker and watch both.',
  controls: [
    {
      id: 'shape',
      label: 'Rotation curve',
      min: 0,
      max: 2,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => ENCLOSED_CURVES[Math.round(v)]?.label ?? '—',
    },
    {
      id: 'radius',
      label: 'Radius marker',
      unit: 'kpc',
      min: 2,
      max: 30,
      step: 0.5,
      value: 10,
      decimals: 1,
    },
  ],
  presets: [
    {
      label: 'Falling curve',
      values: { shape: 0, radius: 10 },
      note: 'Drag the marker out. The speed drops and the enclosed mass stops growing: everything is already inside.',
    },
    {
      label: 'Flat curve',
      values: { shape: 1, radius: 10 },
      note: 'Now drag it out. The speed does not change, so the enclosed mass has to keep climbing — in direct proportion to the radius.',
    },
    {
      label: 'A real galaxy',
      values: { shape: 2, radius: 20 },
      note: 'The measured curve of a spiral. Compare the orange line, which is all the mass you can see, with the green one that the stars are actually obeying.',
    },
  ],
  compute(v) {
    const shape = ENCLOSED_CURVES[Math.round(v.shape)]?.key ?? 'kepler';
    const r = v.radius;

    // The three curves are set up to agree at 10 kpc, so that switching between
    // them changes the shape and not the scale.
    const V0 = 150;
    const R0 = 10;
    const model = {
      bulgeMass: 0.05e10,
      discMass: 3.3e10,
      discScale: 2.6,
      haloVFlat: 150,
      haloCore: 6,
    };

    let speedAt;
    let visibleAt = null;
    if (shape === 'kepler') {
      const M = enclosedMassFromSpeed(R0, V0);
      speedAt = rr => pointMassSpeed(rr, M);
    } else if (shape === 'flat') {
      speedAt = () => V0;
    } else {
      speedAt = rr => galaxyCurveAt(rr, model).total;
      visibleAt = rr => galaxyCurveAt(rr, model).visible;
    }

    const speed = speedAt(r);
    const enclosed = enclosedMassFromSpeed(r, speed);
    // The comparison that makes the point: what does doubling the radius do?
    const doubled = enclosedMassFromSpeed(
      Math.min(30, r * 2),
      speedAt(Math.min(30, r * 2))
    );
    return {
      shape,
      r,
      speedAt,
      visibleAt,
      speed,
      enclosed,
      growth: enclosed > 0 ? doubled / enclosed : NaN,
      massAt: rr => enclosedMassFromSpeed(rr, speedAt(rr)),
      visibleMassAt: visibleAt
        ? rr => enclosedMassFromSpeed(rr, visibleAt(rr))
        : null,
      model,
    };
  },
  readout(v) {
    const f = ENCLOSED.compute(v);
    const rows = [
      {
        label: `Speed at ${f.r.toFixed(1)} kpc`,
        value: `${f.speed.toFixed(0)} km/s`,
      },
      { label: 'Mass that must be inside', value: e10(f.enclosed) },
    ];
    if (Number.isFinite(f.growth)) {
      rows.push({
        label: 'Go out twice as far, and the enclosed mass',
        value:
          f.growth > 1.6
            ? `roughly doubles (× ${f.growth.toFixed(2)})`
            : f.growth > 1.15
              ? `keeps growing (× ${f.growth.toFixed(2)})`
              : `barely changes (× ${f.growth.toFixed(2)})`,
        emphasis: true,
      });
    }
    if (f.visibleMassAt) {
      const vis = f.visibleMassAt(f.r);
      rows.push({
        label: 'Of which the visible disc could account for',
        value: `${e10(vis)}  (${((100 * vis) / f.enclosed).toFixed(0)}%)`,
      });
    }
    return rows;
  },
  draw(canvas, v) {
    const H = responsiveHeight(340, 280);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);
    const f = ENCLOSED.compute(v);

    const gap = 30;
    const boxH = (H - 52 - gap) / 2;
    const bx = 46;
    const bw = w - bx - 16;
    if (bw < 60) return;

    // Top: the rotation curve.
    const top = frame(
      ctx,
      { x: bx, y: 10, w: bw, h: boxH },
      { xMax: 30, yMax: 260, yLabel: 'speed (km/s)', yTicks: 4 }
    );
    // The radius marker starts at 2 kpc, so the curve is drawn from 1: far
    // enough out that the point-mass bulge is not being asked about its own
    // interior, and still left of anything a student can select.
    const R_MIN = 1;
    if (f.visibleAt) {
      curve(ctx, top, 30, f.visibleAt, C_VISIBLE, {
        width: 1.8,
        dash: [5, 4],
        rMin: R_MIN,
      });
    }
    curve(ctx, top, 30, f.speedAt, C_TOTAL, { width: 2.6, rMin: R_MIN });

    // Bottom: the enclosed mass. Its scale is set by the largest value on
    // screen, so a flat curve's straight line fills the box instead of hugging
    // the axis.
    let mMax = 0;
    for (let i = 1; i <= 30; i++) mMax = Math.max(mMax, f.massAt(i));
    const yMax = Math.max(1, Math.ceil((mMax * 1.12) / 1e10)) * 1e10;
    const bot = frame(
      ctx,
      { x: bx, y: 10 + boxH + gap, w: bw, h: boxH },
      {
        xMax: 30,
        yMax: yMax / 1e10,
        xLabel: 'radius  (kpc)',
        yLabel: 'mass inside (10¹⁰ M☉)',
        yTicks: 4,
      }
    );
    if (f.visibleMassAt) {
      curve(ctx, bot, 30, rr => f.visibleMassAt(rr) / 1e10, C_VISIBLE, {
        width: 1.8,
        dash: [5, 4],
        rMin: R_MIN,
      });
    }
    curve(ctx, bot, 30, rr => f.massAt(rr) / 1e10, C_HALO, {
      width: 2.6,
      rMin: R_MIN,
    });

    // The radius marker, drawn through both plots so they read as one
    // measurement rather than two pictures.
    const px = top.X(f.r);
    ctx.strokeStyle = 'rgba(233,237,247,0.5)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(px, 10);
    ctx.lineTo(px, 10 + boxH * 2 + gap);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const [t, value, color] of [
      [top, f.speed, C_TOTAL],
      [bot, f.enclosed / 1e10, C_HALO],
    ]) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, t.Y(value), 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = SKY;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let kx = bx + 6;
    if (f.visibleAt) {
      ctx.fillStyle = MUTED;
      kx += key(ctx, kx, 18, C_VISIBLE, 'what you can see', true);
      key(ctx, kx, 18, C_TOTAL, 'what the stars do');
    }
  },
};

// =============================================================================
// 3. dm-fit - fit a real galaxy. The centre of the lesson.
// =============================================================================
//
// The activity a graduate student doing this for real spends weeks on, reduced
// to four sliders. What survives the reduction is the thing that matters: there
// is no setting of the visible components alone that fits both ends of the
// curve, and discovering that by failing to do it is worth more than being told.

/**
 * The model the synthetic curve is generated from.
 *
 * Built from NGC 3198's published structural parameters rather than from anyone's
 * data table: a 2.6 kpc exponential disc scale length, an asymptotic speed near
 * 150 km/s, and a curve measured out to about 30 kpc. The halo core radius is
 * chosen to put the decomposition in the usual place, where the disc dominates
 * inside about 8 kpc and the halo takes over outside it.
 */
const NGC3198 = {
  bulgeMass: 0.05e10,
  discMass: 3.3e10,
  discScale: 2.6,
  haloVFlat: 150,
  haloCore: 6,
};

/**
 * The synthetic observed curve, with a fixed scatter so it reads as measurement.
 *
 * The offsets are written out rather than generated, because a random scatter
 * would give every student a different galaxy and a fitting exercise needs a
 * fixed target. Errors grow outward, as they do in a real curve: the outer
 * points come from fainter gas over a longer integration.
 */
const NGC3198_OBSERVED = [
  { r: 1, off: 2, err: 3 },
  { r: 2, off: -3, err: 3 },
  { r: 3, off: 1, err: 3 },
  { r: 4, off: 3, err: 3 },
  { r: 6, off: -2, err: 4 },
  { r: 8, off: 2, err: 4 },
  { r: 11, off: -3, err: 5 },
  { r: 14, off: 1, err: 5 },
  { r: 18, off: 2, err: 6 },
  { r: 22, off: -2, err: 6 },
  { r: 26, off: 1, err: 7 },
  { r: 30, off: -1, err: 7 },
].map(p => ({
  r: p.r,
  v: galaxyCurveAt(p.r, NGC3198).total + p.off,
  err: p.err,
}));

/**
 * The fitting instrument's presets.
 *
 * Held outside the widget so a step can be offered a subset. `needsHalo` marks
 * the one that switches the halo on, which the stars-only steps withhold.
 */
const FIT_PRESETS = [
  {
    label: 'Stars only',
    values: { discMass: 3.3, discScale: 2.6, haloVFlat: 0, haloCore: 6 },
    note: 'The disc alone, at the mass its light implies. It fits the inner curve and then falls away from the data. Try pushing the disc mass up to close the gap.',
  },
  {
    label: 'Maximum disc',
    values: { discMass: 11, discScale: 2.6, haloVFlat: 0, haloCore: 6 },
    note: 'The heaviest disc that could be argued for, and still no good: now the inner points are far too fast and the outer ones are still too slow. No single disc mass fits both ends. That is the whole result.',
  },
  {
    label: 'Wrong scale length',
    values: { discMass: 3.3, discScale: 7, haloVFlat: 0, haloCore: 6 },
    note: 'Spreading the same stars further out flattens the disc curve a little, but not nearly enough, and now the inner curve is wrong too. The shape of the shortfall does not look like a disc.',
  },
  {
    label: 'Published decomposition',
    needsHalo: true,
    values: { discMass: 3.3, discScale: 2.6, haloVFlat: 150, haloCore: 6 },
    note: 'Disc plus halo. The disc carries the inner curve, the halo carries the outer curve, and between them they fit. There is no version of this without the halo.',
  },
];

const FIT = {
  id: 'dm-fit',
  title: 'Fit a real galaxy',
  note: 'The pink points with error bars are the measured rotation curve of a spiral galaxy. Your job is to reproduce them. The disc is what you can see; the halo is what you cannot. Try the disc on its own first.',
  controls: [
    {
      id: 'discMass',
      label: 'Disc mass (the stars you can see)',
      unit: '× 10¹⁰ M☉',
      min: 0,
      max: 16,
      step: 0.1,
      value: 3.3,
      decimals: 1,
    },
    {
      id: 'discScale',
      label: 'Disc scale length',
      unit: 'kpc',
      min: 1,
      max: 8,
      step: 0.1,
      value: 2.6,
      decimals: 1,
    },
    {
      id: 'haloVFlat',
      label: 'Halo strength (its flat speed)',
      unit: 'km/s',
      min: 0,
      max: 220,
      step: 2,
      value: 0,
      decimals: 0,
    },
    {
      id: 'haloCore',
      label: 'Halo core radius',
      unit: 'kpc',
      min: 1,
      max: 20,
      step: 0.5,
      value: 6,
      decimals: 1,
    },
  ],
  /**
   * Which presets a step offers.
   *
   * The published decomposition is withheld on the steps that hide the halo
   * sliders. Those steps ask a student to fit the curve with stars alone and
   * mean it; a button that quietly switched on an invisible halo would both give
   * the answer away and produce a FITTED marker with nothing on screen to
   * explain it.
   *
   * @param {Object} [spec] - The step's tool spec
   * @returns {Array} Presets to show
   */
  presets(spec = {}) {
    const haloHidden = (spec.hide || []).includes('haloVFlat');
    return FIT_PRESETS.filter(p => !(haloHidden && p.needsHalo));
  },
  compute(v) {
    const model = {
      bulgeMass: NGC3198.bulgeMass,
      discMass: v.discMass * 1e10,
      discScale: v.discScale,
      haloVFlat: v.haloVFlat,
      haloCore: v.haloCore,
    };
    const fit = curveResidual(NGC3198_OBSERVED, model);
    const R_OUT = 30;
    const visibleMass = model.bulgeMass + model.discMass;
    const haloMass = haloEnclosedMass(
      R_OUT,
      { vFlat: model.haloVFlat, coreRadius: model.haloCore },
      G_GALACTIC
    );
    // The mean error on the data, which is the yardstick the fit is judged
    // against. A fit better than the errors is as good as the data allows.
    const meanErr =
      NGC3198_OBSERVED.reduce((s, p) => s + p.err, 0) / NGC3198_OBSERVED.length;
    return {
      model,
      fit,
      visibleMass,
      haloMass,
      meanErr,
      good: fit.rms <= meanErr,
      ratio: visibleMass > 0 ? haloMass / visibleMass : NaN,
    };
  },
  readout(v) {
    const f = FIT.compute(v);
    const verdict =
      f.fit.rms <= f.meanErr
        ? 'as good as the data allows'
        : f.fit.rms < 2 * f.meanErr
          ? 'close'
          : f.fit.rms < 6 * f.meanErr
            ? 'not there yet'
            : 'nowhere near';
    const rows = [
      {
        label: 'Average miss',
        value: `${f.fit.rms.toFixed(1)} km/s  (data is good to ±${f.meanErr.toFixed(0)})`,
      },
      { label: 'Fit', value: verdict, emphasis: true },
      {
        label: `Worst point, at ${f.fit.worstR.toFixed(0)} kpc`,
        value: `${f.fit.worst > 0 ? 'model too fast by ' : 'model too slow by '}${Math.abs(f.fit.worst).toFixed(0)} km/s`,
      },
      { label: 'Visible mass', value: e10(f.visibleMass) },
    ];
    if (f.model.haloVFlat > 0) {
      rows.push({ label: 'Halo mass inside 30 kpc', value: e10(f.haloMass) });
      rows.push({
        label: 'Dark mass for every unit of visible',
        value: `${f.ratio.toFixed(1)} ×`,
        emphasis: f.good,
      });
    } else {
      rows.push({
        label: 'Halo mass inside 30 kpc',
        value: 'none — halo switched off',
      });
    }
    return rows;
  },
  draw(canvas, v) {
    const H = responsiveHeight(320, 260);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);
    const f = FIT.compute(v);

    const box = { x: 46, y: 26, w: w - 62, h: H - 74 };
    if (box.w < 60) return;
    const t = frame(ctx, box, {
      xMax: 32,
      yMax: 260,
      xLabel: 'radius  (kpc)',
      yLabel: 'speed  (km/s)',
    });

    // Components underneath, thin, so the total reads as the sum of them.
    // The innermost measured point is at 1 kpc, so nothing is drawn inside 0.5.
    const R_MIN = 0.5;
    curve(ctx, t, 32, r => galaxyCurveAt(r, f.model).disc, C_DISC, {
      width: 1.4,
      dash: [4, 3],
      rMin: R_MIN,
    });
    if (f.model.haloVFlat > 0) {
      curve(ctx, t, 32, r => galaxyCurveAt(r, f.model).halo, C_HALO, {
        width: 1.4,
        dash: [4, 3],
        rMin: R_MIN,
      });
    }
    curve(ctx, t, 32, r => galaxyCurveAt(r, f.model).total, C_TOTAL, {
      width: 2.6,
      rMin: R_MIN,
    });

    // The data last, on top, with error bars: they are what is being fitted and
    // they should never be hidden behind a model line.
    for (const p of NGC3198_OBSERVED) {
      const px = t.X(p.r);
      ctx.strokeStyle = C_DATA;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(px, t.Y(p.v - p.err));
      ctx.lineTo(px, t.Y(p.v + p.err));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px - 3, t.Y(p.v - p.err));
      ctx.lineTo(px + 3, t.Y(p.v - p.err));
      ctx.moveTo(px - 3, t.Y(p.v + p.err));
      ctx.lineTo(px + 3, t.Y(p.v + p.err));
      ctx.stroke();
      ctx.fillStyle = C_DATA;
      ctx.beginPath();
      ctx.arc(px, t.Y(p.v), 3, 0, 2 * Math.PI);
      ctx.fill();
    }

    // A shaded band showing where the model misses, which turns "the fit is bad"
    // into "the fit is bad here, by this much".
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let kx = box.x + 4;
    kx += key(ctx, kx, 12, C_DATA, 'measured');
    kx += key(ctx, kx, 12, C_DISC, 'disc', true);
    if (f.model.haloVFlat > 0) kx += key(ctx, kx, 12, C_HALO, 'halo', true);
    key(ctx, kx, 12, C_TOTAL, 'your model');

    if (f.good) {
      ctx.fillStyle = C_TOTAL;
      ctx.font = `bold 11px ${MONO}`;
      ctx.textAlign = 'right';
      halo(ctx, 'FITTED', box.x + box.w - 6, box.y + 6);
    }
  },
};

// =============================================================================
// 4. dm-flyby - fly a star through the halo, then take the halo away
// =============================================================================
//
// The halo is a term in the force law. It has no position, it is not drawn, and
// on the main simulation canvas its absence looks like nothing happening. This
// panel is the one place a student can see what it does: launch a star on a
// circular orbit, switch the halo off, and watch it leave.

let flyby = null;

const FLYBY = {
  id: 'dm-flyby',
  title: 'What the halo is holding',
  note: 'A star launched on a circular orbit at the speed a real galaxy gives it. The dashed ring is where it started. Switch the halo off while it runs.',
  animated: true,
  controls: [
    {
      id: 'radius',
      label: 'Launch radius',
      unit: 'kpc',
      min: 6,
      max: 28,
      step: 1,
      value: 20,
      decimals: 0,
    },
    {
      id: 'halo',
      label: 'Dark matter halo',
      min: 0,
      max: 1,
      step: 1,
      value: 1,
      decimals: 0,
      format: v => (v > 0.5 ? 'ON' : 'OFF'),
    },
  ],
  actions: [
    { id: 'run', label: '▶ Run / Pause' },
    { id: 'reset', label: '↺ Relaunch' },
  ],
  presets: [
    {
      label: 'Halo on',
      values: { radius: 20, halo: 1 },
      note: 'The star holds its orbit. The visible disc could never do this on its own at 20 kpc.',
    },
    {
      label: 'Halo off',
      values: { radius: 20, halo: 0 },
      note: 'Same star, same speed, no halo. It is moving far too fast for the mass it can see, so it leaves. This is what a real galaxy would do if the light told the whole story.',
    },
  ],
  /**
   * The launch speed and the two accelerations.
   *
   * The star is always launched at the speed the *full* model gives, halo
   * included, because that is what is measured in a real galaxy. Switching the
   * halo off then removes the mass without removing the motion, which is exactly
   * the situation the flat rotation curve presents.
   *
   * @param {Object} v - Control values
   * @returns {Object} Launch speed, and a function giving the inward pull
   */
  compute(v) {
    const withHalo = v.halo > 0.5;
    const model = { ...NGC3198 };
    const launchSpeed = galaxyCurveAt(v.radius, model).total;
    const visibleSpeed = galaxyCurveAt(v.radius, model).visible;
    // A circular orbit needs a = v^2/r, so the inward pull at any radius is the
    // square of whichever circular speed applies there, over r.
    const pull = r => {
      if (!(r > 0)) return 0;
      const c = galaxyCurveAt(r, model);
      const speed = withHalo ? c.total : c.visible;
      return (speed * speed) / r;
    };
    return { withHalo, model, launchSpeed, visibleSpeed, pull };
  },
  key: v => `${v.radius}|${v.halo}`,
  reset(v, { autorun = true } = {}) {
    const f = FLYBY.compute(v);
    flyby = {
      key: FLYBY.key(v),
      // Units: kpc and km/s, with time in kpc/(km/s) - about 0.98 Gyr - so no
      // conversion factor appears anywhere in the step below.
      x: v.radius,
      y: 0,
      vx: 0,
      vy: f.launchSpeed,
      t: 0,
      r0: v.radius,
      trail: [],
      running: autorun,
      escaped: false,
    };
  },
  act(id, v) {
    if (!flyby || flyby.key !== FLYBY.key(v))
      FLYBY.reset(v, { autorun: false });
    if (id === 'run') flyby.running = !flyby.running;
    else if (id === 'reset') FLYBY.reset(v, { autorun: true });
  },
  step(v, dt) {
    if (!flyby || flyby.key !== FLYBY.key(v)) FLYBY.reset(v);
    if (!flyby.running) return;
    const f = FLYBY.compute(v);
    // Enough steps per orbit that the circle looks like a circle: an orbit at 20
    // kpc and 150 km/s closes in about 0.84 of these time units.
    const h = 0.0015;
    const sub = Math.max(1, Math.min(24, Math.round((dt * 0.9) / h)));
    for (let i = 0; i < sub; i++) {
      const r = Math.hypot(flyby.x, flyby.y);
      if (r > 0) {
        const a = f.pull(r);
        flyby.vx -= ((a * flyby.x) / r) * h;
        flyby.vy -= ((a * flyby.y) / r) * h;
      }
      flyby.x += flyby.vx * h;
      flyby.y += flyby.vy * h;
      flyby.t += h;
    }
    const r = Math.hypot(flyby.x, flyby.y);
    // Stop at the point of departure rather than following the star out of the
    // county. The claim being demonstrated is that it leaves, and freezing it
    // just inside the edge of the view keeps the outbound trail on screen; left
    // running, it reached two thousand kpc and there was nothing to look at.
    if (r > 3 * flyby.r0) {
      flyby.escaped = true;
      flyby.running = false;
    }
    flyby.trail.push({ x: flyby.x, y: flyby.y });
    if (flyby.trail.length > 900) flyby.trail.shift();
  },
  readout(v) {
    const f = FLYBY.compute(v);
    const r = flyby ? Math.hypot(flyby.x, flyby.y) : v.radius;
    const rows = [
      { label: 'Halo', value: f.withHalo ? 'ON' : 'OFF' },
      { label: 'Launch speed', value: `${f.launchSpeed.toFixed(0)} km/s` },
      {
        label: 'Speed the visible disc alone could hold',
        value: `${f.visibleSpeed.toFixed(0)} km/s`,
      },
      {
        label: 'Distance now',
        value: `${r.toFixed(1)} kpc  (launched at ${v.radius})`,
        emphasis: true,
      },
    ];
    if (flyby?.escaped) {
      rows.push({
        label: 'Verdict',
        value: 'gone — the visible mass could not hold it',
        emphasis: true,
      });
    }
    return rows;
  },
  draw(canvas, v) {
    const H = responsiveHeight(300, 240);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);
    if (!flyby || flyby.key !== FLYBY.key(v)) FLYBY.reset(v);
    const f = FLYBY.compute(v);

    const cx = w / 2;
    const cy = H / 2;
    // Fixed scale, so switching the halo off does not rescale the view and
    // disguise the star leaving as the camera pulling back.
    const span = 3.2 * v.radius;
    const scale = (Math.min(w, H) * 0.44) / span;
    const P = (x, y) => [cx + x * scale, cy - y * scale];

    // The halo, drawn as what it is: a smooth glow with no edge, present or
    // absent.
    if (f.withHalo) {
      for (let i = 10; i >= 1; i--) {
        const rr = (i / 10) * span * scale;
        ctx.fillStyle = `rgba(192,140,255,${0.055 + 0.05 / (1 + (rr / (f.model.haloCore * scale)) ** 2)})`;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // The visible galaxy: a bright disc that plainly stops.
    const discR = 4 * f.model.discScale * scale;
    for (let i = 10; i >= 1; i--) {
      const rr = (i / 10) * discR;
      ctx.fillStyle = `rgba(143,212,255,${0.4 * Math.exp(-rr / (f.model.discScale * scale))})`;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.fillStyle = C_BULGE;
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, 2 * Math.PI);
    ctx.fill();

    // Where it started.
    ctx.strokeStyle = 'rgba(233,237,247,0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, flyby.r0 * scale, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    // The path.
    if (flyby.trail.length > 1) {
      ctx.strokeStyle = f.withHalo ? C_TOTAL : WARN;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      flyby.trail.forEach((p, i) => {
        const [px, py] = P(p.x, p.y);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    const [sx, sy] = P(flyby.x, flyby.y);
    ctx.fillStyle = f.withHalo ? C_TOTAL : WARN;
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, 2 * Math.PI);
    ctx.fill();

    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = f.withHalo ? C_HALO : WARN;
    halo(ctx, f.withHalo ? 'halo ON' : 'halo OFF', 8, 8);
    if (!flyby.running && !flyby.escaped) {
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'right';
      halo(ctx, 'paused', w - 8, 8);
    }
    if (flyby.escaped) {
      ctx.fillStyle = WARN;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      halo(ctx, 'the star has left the galaxy', cx, H - 8);
    }
  },
};

// =============================================================================
// 5. dm-virial - Zwicky's arithmetic, with the classic mistakes reachable
// =============================================================================
//
// The lesson asked a student to do this on paper and then typed the answer into
// a tolerance. That is a fine way to check arithmetic and a poor way to teach
// what the arithmetic means. Here the two mistakes everyone makes - using sigma
// where sigma squared belongs, and forgetting that a spectrum measures one
// velocity component out of three - are selectable, so a student can see what
// each one does to the answer instead of being warned about it.

/** Coma Cluster, as it is usually quoted. G in Mpc (km/s)^2 / M_sun. */
const G_CLUSTER = 4.30091727e-9;
const COMA = {
  sigmaLos: 1000, // km/s, line-of-sight velocity dispersion
  radius: 1.4, // Mpc, the radius the virial mass is usually quoted within
  starMass: 3e13, // M_sun in galaxies
  gasMass: 1.2e14, // M_sun in hot intracluster gas, from X-ray observations
};

const VIRIAL = {
  id: 'dm-virial',
  title: 'Weigh a cluster by how fast it jitters',
  note: 'A cluster does not rotate, so there is no curve to plot. What there is instead is a spread of speeds, and the virial theorem turns a spread of speeds into a mass: M = (5/3)·R·⟨v²⟩/G.',
  controls: [
    {
      id: 'sigma',
      label: 'Measured line-of-sight spread σ',
      unit: 'km/s',
      min: 200,
      max: 1600,
      step: 25,
      value: 1000,
      decimals: 0,
    },
    {
      id: 'radius',
      label: 'Cluster radius R',
      unit: 'Mpc',
      min: 0.4,
      max: 3,
      step: 0.1,
      value: 1.4,
      decimals: 1,
    },
    {
      id: 'dims',
      label: 'Turn σ into ⟨v²⟩ using',
      min: 0,
      max: 2,
      step: 1,
      value: 1,
      decimals: 0,
      format: v =>
        ['σ itself (wrong)', '3σ² (correct)', 'σ² only (wrong)'][
          Math.round(v)
        ] ?? '',
    },
  ],
  presets: [
    {
      label: 'Coma, done right',
      values: { sigma: 1000, radius: 1.4, dims: 1 },
      note: 'A spectrograph gives one velocity component out of three, so ⟨v²⟩ = 3σ². This is the measurement Zwicky made, and it needs about ten times more mass than the galaxies and gas can supply.',
    },
    {
      label: 'Forget the factor of 3',
      values: { sigma: 1000, radius: 1.4, dims: 2 },
      note: 'Using σ² alone throws away two of the three directions the galaxies are moving in, and the mass comes out three times too small. This is the commonest mistake in the calculation.',
    },
    {
      label: 'Forget to square it',
      values: { sigma: 1000, radius: 1.4, dims: 0 },
      note: 'Using σ rather than σ² is not an approximation, it is a different quantity with different units. The answer is out by a factor of a thousand and the discrepancy vanishes — which is how you know something went wrong.',
    },
  ],
  compute(v) {
    const mode = Math.round(v.dims);
    // The three ways of getting from a measured sigma to <v^2>, only one of
    // which is right. Left reachable on purpose.
    const meanSquare =
      mode === 0
        ? v.sigma
        : mode === 2
          ? v.sigma ** 2
          : losToMeanSquare(v.sigma, 3);
    const dynamical = virialMass(meanSquare, v.radius, G_CLUSTER);
    const visible = COMA.starMass;
    const baryons = COMA.starMass + COMA.gasMass;
    return {
      mode,
      meanSquare,
      dynamical,
      visible,
      baryons,
      vsStars: visible > 0 ? dynamical / visible : NaN,
      vsBaryons: baryons > 0 ? dynamical / baryons : NaN,
      correct: mode === 1,
    };
  },
  readout(v) {
    const f = VIRIAL.compute(v);
    const rows = [
      {
        label: '⟨v²⟩',
        value: withUnit(scientific(f.meanSquare, 3), '(km/s)²'),
      },
      {
        label: 'Mass the motion needs',
        value: massLabel(f.dynamical),
        emphasis: true,
      },
      { label: 'Mass in galaxies', value: massLabel(f.visible) },
      { label: 'Plus hot gas between them', value: massLabel(f.baryons) },
      {
        label: 'Needed ÷ everything you can see',
        // A wrong setting can drive this to a few thousandths, and rounding that
        // to "0.0" hides the very thing it is meant to reveal: the discrepancy
        // has not shrunk, it has been arithmetically destroyed.
        value: !Number.isFinite(f.vsBaryons)
          ? '—'
          : `${f.vsBaryons < 1 ? f.vsBaryons.toPrecision(2) : f.vsBaryons.toFixed(1)} ×`,
        emphasis: f.correct,
      },
    ];
    if (!f.correct) {
      rows.push({
        label: 'Warning',
        value:
          f.mode === 0
            ? 'σ is a speed, not a speed squared — check the units'
            : 'a spectrum sees one direction out of three',
        emphasis: true,
      });
    }
    return rows;
  },
  draw(canvas, v) {
    const H = responsiveHeight(300, 240);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);
    const f = VIRIAL.compute(v);

    // Left: the cluster, with a line-of-sight velocity on each galaxy. The
    // arrows are the measurement; the dots are the light.
    const picW = Math.min(190, w * 0.44);
    const cx = picW / 2;
    const cy = H * 0.46;
    const picR = Math.min(picW, H) * 0.36;

    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(cx, cy, picR, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    // A fixed pseudo-random cluster, so the picture does not jitter between
    // repaints and every student sees the same one.
    let seed = 20240611;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const arrowScale = (picR * 0.5) / 1600;
    for (let i = 0; i < 26; i++) {
      const a = rnd() * 2 * Math.PI;
      // sqrt for an even areal spread rather than a crowded centre.
      const rr = Math.sqrt(rnd()) * picR * 0.92;
      const gx = cx + rr * Math.cos(a);
      const gy = cy + rr * Math.sin(a);
      // A line-of-sight speed drawn from the dispersion being measured.
      const los = (rnd() * 2 - 1) * v.sigma;
      ctx.strokeStyle = los > 0 ? '#ff8080' : '#80b0ff';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx, gy - los * arrowScale);
      ctx.stroke();
      ctx.fillStyle = '#ffe9b0';
      ctx.beginPath();
      ctx.ellipse(gx, gy, 3.2, 2.1, a, 0, 2 * Math.PI);
      ctx.fill();
    }
    // Left-aligned rather than centred on the cluster: the caption is wider than
    // the picture beside it, and centring ran it off the left edge.
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    halo(ctx, 'red = receding, blue = approaching', 4, H - 4);

    // Right: two bars. The mass the motion demands, and the mass there is.
    const bx = picW + 18;
    const bw = w - bx - 14;
    if (bw < 70) return;
    const top = 26;
    const barH = 22;
    const scaleMax = Math.max(f.dynamical, f.baryons) * 1.08;

    ctx.textAlign = 'left';
    ctx.fillStyle = MUTED;
    halo(ctx, 'mass the motion needs', bx, top - 14);
    const wNeed = Math.max(2, (f.dynamical / scaleMax) * bw);
    ctx.fillStyle = C_HALO;
    ctx.beginPath();
    ctx.roundRect(bx, top, wNeed, barH, 3);
    ctx.fill();
    barLabel(ctx, massLabel(f.dynamical), bx, top, wNeed, barH);

    ctx.fillStyle = MUTED;
    halo(ctx, 'mass you can see', bx, top + barH + 20);
    const wStars = Math.max(1, (f.visible / scaleMax) * bw);
    const wBary = Math.max(2, (f.baryons / scaleMax) * bw);
    ctx.fillStyle = 'rgba(255,176,87,0.35)';
    ctx.beginPath();
    ctx.roundRect(bx, top + barH + 34, wBary, barH, 3);
    ctx.fill();
    ctx.fillStyle = C_BULGE;
    ctx.beginPath();
    ctx.roundRect(bx, top + barH + 34, wStars, barH, 3);
    ctx.fill();
    barLabel(ctx, massLabel(f.baryons), bx, top + barH + 34, wBary, barH);

    // The gap, named.
    if (Number.isFinite(f.vsBaryons) && f.vsBaryons > 1.2) {
      ctx.fillStyle = f.correct ? C_DATA : WARN;
      ctx.font = `bold 12px ${MONO}`;
      halo(
        ctx,
        `${f.vsBaryons.toFixed(0)}× more than there is`,
        bx,
        top + 2 * barH + 62
      );
    }
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = MUTED;
    halo(ctx, 'pale = hot gas, solid = galaxies', bx, top + 2 * barH + 82);
  },
};

// =============================================================================
// 6. dm-budget - where the mass of the universe actually is
// =============================================================================
//
// The closer. Two measurements in this lesson found more mass than light, in two
// kinds of system, and a student is entitled to ask how much of the universe
// that adds up to. Planck 2018, revealed one layer at a time, because the answer
// only lands if you have to keep zooming in to find yourself.

const BUDGET_LAYERS = [
  { label: 'Everything' },
  { label: 'Just the matter' },
  { label: 'Just the ordinary matter' },
  { label: 'Just the stars' },
];

const BUDGET = {
  id: 'dm-budget',
  title: 'Where the mass of the universe is',
  note: 'Planck 2018 for the split between dark energy, dark matter and ordinary matter; the stellar share of ordinary matter is the usual census figure. Step through the layers.',
  controls: [
    {
      id: 'layer',
      label: 'Zoom in on',
      min: 0,
      max: 3,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => BUDGET_LAYERS[Math.round(v)]?.label ?? '',
    },
  ],
  presets: BUDGET_LAYERS.map((l, i) => ({
    label: l.label,
    values: { layer: i },
    note: [
      'Dark energy is most of it, and it is not mass at all: it is a property of space that makes the expansion speed up. Set it aside and look at the matter.',
      'Of the matter, five parts in six are dark. Everything ever seen through a telescope is the remaining sixth.',
      'And of that ordinary sixth, most is thin gas between the galaxies. Stars are a small fraction of it.',
      'Stars are about half a percent of the universe. The rotation curves you measured are one of the ways that was worked out.',
    ][i],
  })),
  compute(v) {
    const layer = Math.round(v.layer);
    // Planck 2018 TT,TE,EE+lowE+lensing+BAO.
    const darkEnergy = 0.6889;
    const darkMatter = 0.2607;
    const baryons = 0.0493;
    // Of the baryons, the stellar share. Fukugita & Peebles style census.
    const stellarShareOfBaryons = 0.07;
    const stars = baryons * stellarShareOfBaryons;
    return { layer, darkEnergy, darkMatter, baryons, stars };
  },
  readout(v) {
    const f = BUDGET.compute(v);
    const pct = x => `${(100 * x).toFixed(x < 0.01 ? 2 : 1)}%`;
    return [
      { label: 'Dark energy', value: pct(f.darkEnergy) },
      { label: 'Dark matter', value: pct(f.darkMatter) },
      { label: 'Ordinary matter, all of it', value: pct(f.baryons) },
      { label: 'Stars', value: pct(f.stars), emphasis: true },
      {
        label: 'Dark matter for every unit of ordinary matter',
        value: `${(f.darkMatter / f.baryons).toFixed(1)} ×`,
      },
    ];
  },
  draw(canvas, v) {
    const H = responsiveHeight(280, 230);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);
    const f = BUDGET.compute(v);

    const bx = 14;
    const bw = w - 28;
    const barH = 30;
    const gap = 34;
    let y = 22;

    /**
     * One bar, with its segments, drawn to a stated total so successive bars
     * each rescale to the slice above them.
     */
    const row = (title, segs, total) => {
      ctx.font = `10px ${MONO}`;
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      halo(ctx, title, bx, y - 3);
      let x = bx;
      for (const s of segs) {
        const sw = (s.value / total) * bw;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.roundRect(x, y, Math.max(1, sw), barH, 3);
        ctx.fill();
        if (sw > 46) {
          ctx.fillStyle = '#0b0f18';
          ctx.font = `bold 10px ${MONO}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(s.label, x + sw / 2, y + barH / 2);
        }
        x += sw;
      }
      y += barH + gap;
    };

    row(
      'the whole universe',
      [
        { value: f.darkEnergy, color: '#3d4a6b', label: 'dark energy' },
        { value: f.darkMatter, color: C_HALO, label: 'dark matter' },
        { value: f.baryons, color: C_BULGE, label: 'ordinary' },
      ],
      1
    );

    if (f.layer >= 1) {
      row(
        'the matter alone',
        [
          { value: f.darkMatter, color: C_HALO, label: 'dark matter' },
          { value: f.baryons, color: C_BULGE, label: 'ordinary' },
        ],
        f.darkMatter + f.baryons
      );
    }
    if (f.layer >= 2) {
      row(
        'the ordinary matter alone',
        [
          { value: f.baryons - f.stars, color: '#c98a4b', label: 'gas' },
          { value: f.stars, color: '#ffe9b0', label: 'stars' },
        ],
        f.baryons
      );
    }
    if (f.layer >= 3) {
      ctx.fillStyle = C_DATA;
      ctx.font = `bold 12px ${MONO}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      halo(
        ctx,
        `Everything you have ever seen: ${(100 * f.stars).toFixed(2)}%`,
        bx,
        y - gap + 8
      );
    }
  },
};

/** Every instrument "The Missing Mass" hands out. */
export const DARK_MATTER_WIDGETS = [
  SHAPES,
  ENCLOSED,
  FIT,
  FLYBY,
  VIRIAL,
  BUDGET,
];

/** Exported for the tests: the synthetic curve and the model behind it. */
export { NGC3198, NGC3198_OBSERVED, COMA, G_CLUSTER };
