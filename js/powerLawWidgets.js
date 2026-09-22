// =============================================================================
// The instruments for the power-law investigation
// -----------------------------------------------------------------------------
// Three tools, one exponent between them. Each takes n, runs the model in
// js/powerLawGravity.js, and reports what it measured.
//
// Everything a tool shows is in its `readout`, which is a list of labels and
// values rendered as text. That is the whole accessibility story for this
// lesson and it is structural rather than an addition: there is no number on a
// canvas that is not also in a readout row, because the canvas and the readout
// are drawn from the same measurement and the readout is the one the model
// hands over.
//
// The exponent slider stops at 2.9 rather than 3. A circular orbit under r^-n
// is stable only for n < 3; at the boundary the apsidal angle diverges and a
// body nudged off a circle spirals instead of oscillating. The lesson says so
// in words, and the slider declines to put a student inside it wondering
// whether the simulation is broken.
// =============================================================================

import {
  EXPONENT_RANGE,
  LESSON_ECCENTRICITY,
  STABILITY_EXPONENT,
} from './powerLawGravity.js';
import {
  PRESETS,
  conservationRows,
  keplerRows,
  measureAt,
  path,
  precessionRows,
  referenceRadius,
  refinement,
  refinementRows,
} from './powerLawLab.js';
import { surface, responsiveHeight, MONO } from './widgetCanvas.js';

/**
 * The exponent control, shared by all three instruments.
 *
 * Step of 0.05 rather than something finer: the measurements take tens of
 * milliseconds each and are cached per exponent, so a continuous slider would
 * fill the cache with values nobody asked for. 0.05 is also about the smallest
 * change whose effect on the precession a student can see without reading the
 * number, which makes the grain of the control match the grain of the result.
 */
const exponentControl = () => ({
  id: 'n',
  label: 'Force-law exponent n',
  unit: '',
  min: EXPONENT_RANGE.min,
  max: EXPONENT_RANGE.max,
  step: 0.05,
  value: 2,
  decimals: 2,
});

/**
 * The preset exponents, with a sentence each saying why that one is offered.
 *
 * @returns {Array<object>} Preset descriptors
 */
const exponentPresets = () =>
  PRESETS.map(n => ({
    label: `n = ${n}`,
    values: { n },
    note:
      n === 2
        ? 'Newton. The control: a closed ellipse that does not turn.'
        : n < 2
          ? 'Shallower than Newton. The orbit turns backwards.'
          : n < 2.1
            ? 'Two and a half percent steeper than Newton, and already visible.'
            : n < 2.3
              ? 'Steeper. The ellipse turns about forty degrees every time round.'
              : 'Steep enough that the orbit never looks like it is closing.',
  }));

// --- Drawing -----------------------------------------------------------------
//
// Every curve below is drawn from the same measurement its readout reports.
// None of them is an idealized sketch placed beside a measured number, which
// would be two authors of one result.

/** Fill the canvas background. @param {object} ctx - 2D context @param {number} w - Width @param {number} h - Height @returns {void} */
const backdrop = (ctx, w, h) => {
  ctx.fillStyle = 'rgba(8, 10, 20, 0.85)';
  ctx.fillRect(0, 0, w, h);
};

/** Small mono label. @param {object} ctx - Context @param {string} s - Text @param {number} x - X @param {number} y - Y @param {string} [color] - Fill @param {string} [align] - Alignment @returns {void} */
const label = (
  ctx,
  s,
  x,
  y,
  color = 'rgba(220,226,240,0.85)',
  align = 'left'
) => {
  ctx.font = `10px ${MONO}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
};

// =============================================================================
// 1. Does the ellipse close? The apsidal-precession bench
// =============================================================================

const PRECESSION = {
  id: 'power-law-precession',
  title: 'Does the ellipse close?',
  note: `One planet on a mildly eccentric orbit, started at the same place every time. The reference radius is ${referenceRadius().text}, and at that radius the pull is exactly Newtonian no matter what n is — so moving n changes the shape of the field, not its strength.`,
  controls: [exponentControl()],
  presets: exponentPresets(),
  compute(v) {
    return measureAt(v.n);
  },
  readout(v) {
    return precessionRows(v.n);
  },
  draw(canvas, v) {
    const H = responsiveHeight(300, 250);
    const { ctx, w } = surface(canvas, H);
    backdrop(ctx, w, H);
    const { points, maxR } = path(v.n);
    const cx = w / 2;
    const cy = H / 2;
    const scale = (Math.min(w, H) / 2 - 22) / maxR;

    // The reference radius, drawn because it is the one circle on which every
    // exponent agrees. Without it on screen the anchoring is a claim in prose.
    ctx.strokeStyle = 'rgba(255, 216, 107, 0.35)';
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, referenceRadius().sim * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    label(
      ctx,
      'r₀ = 1 AU',
      cx + referenceRadius().sim * scale + 4,
      cy,
      'rgba(255,216,107,0.7)'
    );

    // The path, oldest faint and newest bright, so the turning is visible as
    // the curve failing to retrace itself.
    for (let i = 1; i < points.length; i++) {
      ctx.strokeStyle = `rgba(150, 200, 255, ${0.12 + 0.55 * (i / points.length)})`;
      ctx.beginPath();
      ctx.moveTo(cx + points[i - 1].x * scale, cy - points[i - 1].y * scale);
      ctx.lineTo(cx + points[i].x * scale, cy - points[i].y * scale);
      ctx.stroke();
    }

    ctx.fillStyle = '#FFD86B';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();

    const m = measureAt(v.n);
    label(ctx, `n = ${v.n.toFixed(2)}`, 10, 14);
    label(
      ctx,
      m.precessionDeg === null
        ? 'precession not measured'
        : `${m.precessionDeg.toFixed(2)}° per radial period`,
      10,
      28,
      m.precessionDeg !== null && Math.abs(m.precessionDeg) > 0.5
        ? '#9ad0ff'
        : 'rgba(220,226,240,0.75)'
    );
  },
};

// =============================================================================
// 2. Is it real? The timestep-refinement bench
// =============================================================================

const REFINEMENT = {
  id: 'power-law-refinement',
  title: 'Is the turning real, or is it the computer?',
  note: 'The same orbit, integrated four times at four different timesteps. Integration error depends on the timestep. A property of the force law does not.',
  controls: [exponentControl()],
  presets: exponentPresets(),
  compute(v) {
    return measureAt(v.n);
  },
  readout(v) {
    return refinementRows(v.n);
  },
  draw(canvas, v) {
    const H = responsiveHeight(240, 210);
    const { ctx, w } = surface(canvas, H);
    backdrop(ctx, w, H);
    const rows = refinement(v.n).filter(r => r.deg !== null);
    if (!rows.length) {
      label(ctx, 'no precession measured at this exponent', 12, H / 2);
      return;
    }
    const vals = rows.map(r => r.deg);
    const lo = Math.min(0, ...vals);
    const hi = Math.max(0, ...vals);
    // A deliberately generous vertical range. The point of the picture is that
    // the four readings do not differ, and a range fitted tightly to their
    // spread would magnify floating-point noise into a visible trend.
    const pad = Math.max(1, (hi - lo) * 0.25);
    const L = 54;
    const R = w - 14;
    const T = 26;
    const B = H - 26;
    const Y = d => B - ((d - (lo - pad)) / (hi - lo + 2 * pad)) * (B - T);

    ctx.strokeStyle = 'rgba(220,226,240,0.25)';
    ctx.beginPath();
    ctx.moveTo(L, T);
    ctx.lineTo(L, B);
    ctx.lineTo(R, B);
    ctx.stroke();

    if (lo <= 0 && hi >= 0) {
      ctx.strokeStyle = 'rgba(255,216,107,0.35)';
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(L, Y(0));
      ctx.lineTo(R, Y(0));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    rows.forEach((r, i) => {
      const x = L + ((i + 0.5) / rows.length) * (R - L);
      ctx.fillStyle = '#9ad0ff';
      ctx.beginPath();
      ctx.arc(x, Y(r.deg), 4, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, `dt ${r.dt}`, x, B + 12, 'rgba(220,226,240,0.7)', 'center');
    });
    label(ctx, `n = ${v.n.toFixed(2)}`, 10, 14);
    label(ctx, `${vals[0].toFixed(3)}°`, R, T - 8, '#9ad0ff', 'right');
  },
};

// =============================================================================
// 3. The period-radius slope
// =============================================================================

const KEPLER = {
  id: 'power-law-kepler',
  title: 'How period depends on distance',
  note: 'Six circular orbits, each launched at the correct circular speed for the law that is switched on — not at the Newtonian one, which would not be a circle. Their periods are timed, not calculated.',
  controls: [exponentControl()],
  presets: exponentPresets(),
  compute(v) {
    return measureAt(v.n);
  },
  readout(v) {
    return keplerRows(v.n);
  },
  draw(canvas, v) {
    const H = responsiveHeight(280, 240);
    const { ctx, w } = surface(canvas, H);
    backdrop(ctx, w, H);
    const m = measureAt(v.n);
    const pts = m.keplerPoints.map(p => ({
      x: Math.log10(p.radius),
      y: Math.log10(p.period),
    }));
    if (!pts.length) {
      label(ctx, 'no orbits completed at this exponent', 12, H / 2);
      return;
    }
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const L = 46;
    const R = w - 16;
    const T = 18;
    const B = H - 28;
    const X = x => L + ((x - x0) / (x1 - x0 || 1)) * (R - L);
    const Y = y => B - ((y - y0) / (y1 - y0 || 1)) * (B - T);

    ctx.strokeStyle = 'rgba(220,226,240,0.25)';
    ctx.beginPath();
    ctx.moveTo(L, T);
    ctx.lineTo(L, B);
    ctx.lineTo(R, B);
    ctx.stroke();

    // The fitted line, through the measured points.
    if (m.keplerSlope !== null) {
      const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
      const my = ys.reduce((a, b) => a + b, 0) / ys.length;
      const at = x => my + m.keplerSlope * (x - mx);
      ctx.strokeStyle = 'rgba(154, 208, 255, 0.55)';
      ctx.beginPath();
      ctx.moveTo(X(x0), Y(at(x0)));
      ctx.lineTo(X(x1), Y(at(x1)));
      ctx.stroke();
    }

    ctx.fillStyle = '#9ad0ff';
    for (const p of pts) {
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    label(ctx, 'log P', 8, T + 4);
    label(ctx, 'log r', R, B + 14, 'rgba(220,226,240,0.85)', 'right');
    label(
      ctx,
      m.keplerSlope === null
        ? 'slope not measured'
        : `slope ${m.keplerSlope.toFixed(3)}   (n+1)/2 = ${m.keplerExpected.toFixed(3)}`,
      L + 6,
      T + 4,
      '#9ad0ff'
    );
  },
};

// =============================================================================
// 4. What has not changed
// =============================================================================

const CONSERVATION = {
  id: 'power-law-conservation',
  title: 'What has not changed',
  note: 'Three unequal masses, all of them free to move, run under whatever law is selected. Two of these numbers do not care what n is, and that is the result.',
  controls: [exponentControl()],
  presets: exponentPresets(),
  compute(v) {
    return measureAt(v.n);
  },
  readout(v) {
    return conservationRows(v.n);
  },
  draw(canvas, v) {
    const H = responsiveHeight(220, 200);
    const { ctx, w } = surface(canvas, H);
    backdrop(ctx, w, H);
    const m = measureAt(v.n);
    const bars = [
      { name: 'momentum', value: m.momentumDrift },
      { name: 'angular momentum', value: m.angularDrift },
      { name: 'energy', value: m.energyDrift },
    ];
    // A log scale, because the interesting fact is that two of these are twelve
    // orders of magnitude smaller than the third. On a linear axis they would
    // all be a flat line at zero and the picture would say nothing.
    const floor = -16;
    const L = 132;
    const R = w - 44;
    bars.forEach((b, i) => {
      const y = 38 + i * 46;
      const e = Math.max(floor, Math.log10(Math.max(b.value, 1e-18)));
      const frac = (e - floor) / (0 - floor);
      label(ctx, b.name, L - 8, y, 'rgba(220,226,240,0.85)', 'right');
      ctx.fillStyle = 'rgba(220,226,240,0.12)';
      ctx.fillRect(L, y - 7, R - L, 14);
      ctx.fillStyle = b.value < 1e-10 ? '#7ee0a8' : '#9ad0ff';
      ctx.fillRect(L, y - 7, Math.max(2, frac * (R - L)), 14);
      label(ctx, b.value.toExponential(0), R + 6, y, 'rgba(220,226,240,0.75)');
    });
    label(ctx, `n = ${v.n.toFixed(2)}`, 10, 14);
    label(ctx, 'round-off', L, H - 12, 'rgba(126,224,168,0.8)');
  },
};

export const POWER_LAW_WIDGETS = [PRECESSION, REFINEMENT, KEPLER, CONSERVATION];

/** Test seam: the exponent the instruments refuse to reach. @returns {number} The boundary */
export const stabilityBoundary = () => STABILITY_EXPONENT;
/** Test seam: the eccentricity the precession bench runs at. @returns {number} Eccentricity */
export const benchEccentricity = () => LESSON_ECCENTRICITY;
