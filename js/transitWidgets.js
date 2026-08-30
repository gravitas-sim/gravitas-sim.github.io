// =============================================================================
// Transit widgets: the small instruments the transit lesson hands out
// -----------------------------------------------------------------------------
// Each widget is a canvas, a few sliders, a readout and some presets. The engine
// in investigations.js knows how to render that shape; this file knows the
// physics, so a lesson can say `tool: { id: 'depth-size' }` and get a working
// instrument without the lesson file importing anything.
//
// Everything here is computed rather than drawn from memory. The transit curves
// are integrated over a limb-darkened stellar disk at the ratio and impact
// parameter the sliders are set to, which is why moving the impact parameter
// slider turns a flat-bottomed transit into a V and shortens it at the same
// time: that is what the geometry does, not an animation of what it looks like.
// =============================================================================

import { withUnit } from './format.js';
import { token, surface } from './widgetCanvas.js';

// Quadratic limb darkening, solar values in the optical (Claret 2000). The same
// coefficients the live light curve uses, so a shape worked out here matches a
// shape measured there.
const U1 = 0.4;
const U2 = 0.26;
const I_AVG = 1 - U1 / 3 - U2 / 6;

const R_SUN_KM = 695700;
const R_EARTH_KM = 6371;
const R_JUP_KM = 71492;
const R_EARTH_IN_SUNS = R_EARTH_KM / R_SUN_KM;

// Shared with the other lessons' instruments.

/** Specific intensity at fractional radius r on the stellar disk. */
function intensityAt(r) {
  if (r >= 1) return 0;
  const mu = Math.sqrt(1 - r * r);
  return 1 - U1 * (1 - mu) - U2 * (1 - mu) * (1 - mu);
}

/**
 * Fraction of the star's light a planet blocks.
 *
 * Integrated over the planet's disk rather than taken from a formula, because
 * the interesting cases are the ones the small-planet formula gets wrong:
 * partial overlap during ingress, and a planet grazing the dim limb.
 *
 * @param {number} z - Sky separation of the centers, in stellar radii
 * @param {number} k - Radius ratio Rp/Rstar
 * @param {number} [n] - Grid resolution across the planet
 * @returns {number} Blocked fraction of the total flux
 */
export function blockedFraction(z, k, n = 36) {
  if (z >= 1 + k) return 0;
  const cell = (2 * k) / n;
  const cellArea = cell * cell;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const x = z - k + (i + 0.5) * cell;
    for (let j = 0; j < n; j++) {
      const y = -k + (j + 0.5) * cell;
      const dx = x - z;
      if (dx * dx + y * y > k * k) continue; // outside the planet
      const r2 = x * x + y * y;
      if (r2 >= 1) continue; // off the stellar disk
      sum += intensityAt(Math.sqrt(r2)) * cellArea;
    }
  }
  return sum / (Math.PI * I_AVG);
}

/**
 * Sky-projected separation of planet and star centers.
 * @param {number} theta - Orbital phase from mid-transit, radians
 * @param {number} aOverR - Semi-major axis in stellar radii
 * @param {number} b - Impact parameter
 * @returns {number} Separation in stellar radii
 */
export function separationAt(theta, aOverR, b) {
  const cosI = Math.min(1, b / aOverR);
  const s = Math.sin(theta);
  const c = Math.cos(theta) * cosI;
  return aOverR * Math.sqrt(s * s + c * c);
}

/**
 * Half the total transit duration, as a phase angle.
 * @param {number} aOverR - Semi-major axis in stellar radii
 * @param {number} b - Impact parameter
 * @param {number} k - Radius ratio
 * @returns {number} Half-duration in radians, or 0 when there is no transit
 */
export function halfDuration(aOverR, b, k) {
  const num = (1 + k) * (1 + k) - b * b;
  const den = aOverR * aOverR - b * b;
  if (num <= 0 || den <= 0) return 0;
  const s = Math.sqrt(num / den);
  return s >= 1 ? Math.PI / 2 : Math.asin(s);
}

// --- Drawing helpers ----------------------------------------------------------

/** Draw a limb-darkened stellar disk. */
function drawStarDisk(ctx, cx, cy, R, tint = '255, 236, 196') {
  const steps = 26;
  for (let i = steps; i >= 1; i--) {
    const r = (i / steps) * R;
    const I = intensityAt(Math.min(0.999, (i - 0.5) / steps));
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${tint}, ${0.18 + 0.82 * I})`;
    ctx.fill();
  }
}

/**
 * Plot a light curve into a rectangle.
 * @param {Object} o - Drawing parameters
 */
function drawCurve(ctx, o) {
  const {
    x,
    y,
    w,
    h,
    points,
    yMin,
    yMax,
    color,
    label,
    dashed = false,
    grid,
    muted,
  } = o;
  if (grid) {
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
  const X = t => x + t * w;
  const Y = f => y + h - ((f - yMin) / (yMax - yMin || 1)) * h;
  ctx.beginPath();
  points.forEach((p, i) => {
    const px = X(p.t);
    const py = Y(p.f);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  if (dashed) ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  if (label) {
    ctx.fillStyle = muted;
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, x + 6, y + 5);
  }
}

const pct = v => `${(v * 100).toFixed(3)}%`;
const ppm = v => `${Math.round(v * 1e6).toLocaleString()} ppm`;

// --- 1. Depth and size --------------------------------------------------------

const DEPTH_SIZE = {
  id: 'depth-size',
  title: 'How big a shadow?',
  note: 'The silhouette on the left is drawn to scale. The curve on the right is the transit it produces.',
  controls: [
    {
      id: 'rp',
      label: 'Planet radius',
      unit: 'R⊕',
      min: 0.3,
      max: 15,
      step: 0.1,
      value: 11.2,
      decimals: 1,
    },
    {
      id: 'rs',
      label: 'Star radius',
      unit: 'R☉',
      min: 0.1,
      max: 2,
      step: 0.01,
      value: 1,
      decimals: 2,
    },
  ],
  presets: [
    {
      label: 'Earth, Sun',
      values: { rp: 1, rs: 1 },
      note: 'The case that took a space telescope to reach. 84 parts per million: to see it from the ground you would have to beat the atmosphere by two orders of magnitude.',
    },
    {
      label: 'Neptune, Sun',
      values: { rp: 3.88, rs: 1 },
      note: 'A tenth of a percent. Ground-based surveys can reach this on a bright star, and this is roughly where the great mass of Kepler detections sits.',
    },
    {
      label: 'Jupiter, Sun',
      values: { rp: 11.2, rs: 1 },
      note: 'About 1%. Large enough that the first transit detections, in 1999, were made with a 10 cm telescope. Every early transiting planet was a hot Jupiter for exactly this reason.',
    },
    {
      label: 'Earth, TRAPPIST-1',
      values: { rp: 1, rs: 0.1192 },
      note: 'The same planet against a star a tenth the size. Shrinking the star by 8 lifts the depth by 70: this is why small cool stars are where small planets are found.',
    },
    {
      label: 'Jupiter, red giant',
      values: { rp: 11.2, rs: 15 },
      note: 'The same planet in front of an evolved star. Its shadow has all but vanished, which is one reason transit surveys avoid giants.',
    },
  ],
  compute(v) {
    const k = (v.rp * R_EARTH_IN_SUNS) / Math.max(1e-6, v.rs);
    return { k, depth: k * k };
  },
  readout(v) {
    const { k, depth } = this.compute(v);
    return [
      {
        label: 'Radius ratio R<sub>p</sub> / R<sub>★</sub>',
        value: k.toFixed(4),
      },
      {
        label: 'Transit depth (R<sub>p</sub> / R<sub>★</sub>)²',
        value: pct(depth),
        emphasis: true,
      },
      { label: 'Same depth in survey units', value: ppm(depth) },
      {
        label: 'Photometry needed',
        value:
          depth > 0.005
            ? 'a backyard telescope'
            : depth > 3e-4
              ? 'a good ground-based survey'
              : 'a space telescope',
      },
    ];
  },
  draw(canvas, v) {
    const { ctx, w } = surface(canvas, 220);
    const { k, depth } = this.compute(v);
    const ink = token('--text-primary', '#e9edf7');
    const muted = token('--text-muted', '#8a8f9e');
    const grid = token('--border-subtle', '#2a2f3d');
    const accent = token('--accent', '#38bdf8');

    // Left: the silhouette, sized so the star always fills the same circle.
    const R = 62;
    const cx = 78;
    const cy = 105;
    drawStarDisk(ctx, cx, cy, R);
    const rp = Math.min(R * 3, k * R);
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1, rp), 0, Math.PI * 2);
    ctx.fillStyle = '#10131c';
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = muted;
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`k = ${k.toFixed(4)}`, cx, cy + R + 14);

    // Right: the transit it makes, on a fixed 3% scale so changes are visible
    // as changes rather than being rescaled away.
    const x0 = 176;
    const cw = w - x0 - 10;
    const points = [];
    for (let i = 0; i <= 160; i++) {
      const t = i / 160;
      const z = Math.abs((t - 0.5) * 2) * 1.6 * (1 + k);
      points.push({ t, f: 1 - blockedFraction(z, k) });
    }
    const span = Math.max(0.03, depth * 1.35);
    drawCurve(ctx, {
      x: x0,
      y: 26,
      w: cw,
      h: 150,
      points,
      yMin: 1 - span,
      yMax: 1 + span * 0.12,
      color: accent,
      grid,
      muted,
    });
    ctx.fillStyle = accent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`depth ${pct(depth)}`, x0 + 6, 170);
    ctx.fillStyle = muted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('time', x0 + cw / 2, 182);
    ctx.save();
    ctx.translate(x0 - 8, 100);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('brightness', 0, 0);
    ctx.restore();
    ctx.fillStyle = ink;
    ctx.textAlign = 'left';
    ctx.fillText('fixed 3% scale', x0, 8);
  },
};

// --- 2. Geometry --------------------------------------------------------------

const GEOMETRY = {
  id: 'geometry',
  title: 'The angle you happen to be at',
  note: 'The chord is the path the planet takes across the disk. Slide the impact parameter until it misses.',
  controls: [
    {
      id: 'b',
      label: 'Impact parameter b',
      unit: '',
      min: 0,
      max: 1.4,
      step: 0.01,
      value: 0,
      decimals: 2,
    },
    {
      id: 'aOverR',
      label: 'Orbit size a / R★',
      unit: '',
      min: 3,
      max: 60,
      step: 0.5,
      value: 8.8,
      decimals: 1,
    },
    {
      id: 'k',
      label: 'Radius ratio Rp / R★',
      unit: '',
      min: 0.01,
      max: 0.2,
      step: 0.005,
      value: 0.123,
      decimals: 3,
    },
  ],
  presets: [
    {
      label: 'HD 209458 b',
      values: { b: 0.5, aOverR: 8.8, k: 0.123 },
      note: 'The real geometry of the system next door in the simulation: the planet crosses half way up the disk, not through the middle.',
    },
    {
      label: 'Dead center',
      values: { b: 0, aOverR: 8.8, k: 0.123 },
      note: 'The longest, deepest, flattest transit the system can give. This is what the simulation shows you, because it runs in a plane.',
    },
    {
      label: 'Grazing',
      values: { b: 1.05, aOverR: 8.8, k: 0.123 },
      note: 'Only part of the planet ever covers the star. The dip is short and V-shaped, and its depth no longer measures the radius ratio at all: grazing transits are a classic way to get a planet radius badly wrong.',
    },
    {
      label: 'Missed entirely',
      values: { b: 1.3, aOverR: 8.8, k: 0.123 },
      note: 'The planet passes above the disk. Nothing happens, forever, however long you watch. This is the fate of most planets from any given vantage point.',
    },
    {
      label: 'Earth around the Sun',
      values: { b: 0, aOverR: 215, k: 0.00916 },
      note: 'a / R★ = 215, so the odds of a random observer seeing a transit are about one in 215. Push the impact parameter off zero and the transit is gone almost at once.',
    },
  ],
  compute(v) {
    const b = v.b;
    const A = Math.max(1.5, v.aOverR);
    const k = v.k;
    const half = halfDuration(A, b, k);
    const transits = b < 1 + k && half > 0;
    const cosI = Math.min(1, b / A);
    return {
      b,
      A,
      k,
      half,
      transits,
      inclination: (Math.acos(cosI) * 180) / Math.PI,
      probability: (1 + k) / A,
      durationFraction: half / Math.PI,
      grazing: b > 1 - k && b < 1 + k,
      depth: transits ? blockedFraction(b, k, 90) : 0,
    };
  },
  readout(v) {
    const c = this.compute(v);
    return [
      {
        label: 'Orbital inclination i',
        value: `${c.inclination.toFixed(2)}°`,
      },
      {
        label: 'Does it transit?',
        value: c.transits ? (c.grazing ? 'yes, grazing' : 'yes') : 'no',
        emphasis: true,
      },
      {
        label: 'Depth at mid-transit',
        value: c.transits ? pct(c.depth) : '-',
      },
      {
        label: 'Duration, as a fraction of the orbit',
        value: c.transits ? `${(c.durationFraction * 100).toFixed(2)}%` : '-',
      },
      {
        label: 'Chance a random observer sees it',
        value: `${(c.probability * 100).toFixed(2)}%  (about 1 in ${Math.round(1 / c.probability)})`,
      },
    ];
  },
  draw(canvas, v) {
    const { ctx, w } = surface(canvas, 236);
    const c = this.compute(v);
    const muted = token('--text-muted', '#8a8f9e');
    const grid = token('--border-subtle', '#2a2f3d');
    const accent = token('--accent', '#38bdf8');
    const warn = '#f2a65a';

    const R = 62;
    const cx = 78;
    const cy = 92;
    drawStarDisk(ctx, cx, cy, R);

    // The chord, and the planet on it
    const yChord = cy - c.b * R;
    ctx.strokeStyle = c.transits ? accent : warn;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(cx - R - 14, yChord);
    ctx.lineTo(cx + R + 14, yChord);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(cx - R * 0.35, yChord, Math.max(2, c.k * R), 0, Math.PI * 2);
    ctx.fillStyle = '#10131c';
    ctx.fill();
    ctx.strokeStyle = c.transits ? accent : warn;
    ctx.stroke();

    // b measured up from the center
    ctx.strokeStyle = warn;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 26, cy);
    ctx.lineTo(cx + 26, yChord);
    ctx.stroke();
    ctx.fillStyle = warn;
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    if (c.b > 0.04)
      ctx.fillText(`b = ${c.b.toFixed(2)}`, cx + 32, (cy + yChord) / 2);

    // The curve it produces, always over the same window of orbital phase so
    // that a shorter transit reads as shorter.
    const x0 = 176;
    const cw = w - x0 - 10;
    const window = Math.max(halfDuration(c.A, 0, c.k) * 1.8, 0.02);
    const points = [];
    for (let i = 0; i <= 200; i++) {
      const t = i / 200;
      const theta = (t - 0.5) * 2 * window;
      points.push({
        t,
        f: 1 - blockedFraction(separationAt(theta, c.A, c.b), c.k),
      });
    }
    const full = blockedFraction(0, c.k);
    drawCurve(ctx, {
      x: x0,
      y: 20,
      w: cw,
      h: 150,
      points,
      yMin: 1 - full * 1.35,
      yMax: 1 + full * 0.16,
      color: c.transits ? accent : warn,
      grid,
      muted,
      label: c.transits ? '' : 'no transit at this angle',
    });
    ctx.fillStyle = muted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('orbital phase', x0 + cw / 2, 176);
    ctx.fillText(
      `1 in ${Math.round(1 / c.probability)} chance of seeing this system transit`,
      w / 2,
      206
    );
  },
};

// --- 3. Transmission spectrum -------------------------------------------------

// Absorbers in a hot Jupiter's terminator, as center wavelength in microns,
// width, and height in atmospheric scale heights. Amplitudes are the order of
// what transmission spectra actually show, not fitted to any one planet.
const BANDS = [
  { l: 0.589, s: 0.012, h: 4.2, name: 'sodium' },
  { l: 0.767, s: 0.014, h: 2.6, name: 'potassium' },
  { l: 0.95, s: 0.045, h: 1.7, name: 'water' },
  { l: 1.15, s: 0.06, h: 2.2, name: 'water' },
  { l: 1.4, s: 0.075, h: 3.4, name: 'water' },
  { l: 1.9, s: 0.1, h: 3.0, name: 'water' },
  { l: 2.35, s: 0.09, h: 2.0, name: 'carbon monoxide' },
  { l: 2.7, s: 0.12, h: 2.8, name: 'water' },
  { l: 3.3, s: 0.13, h: 2.4, name: 'methane' },
  { l: 4.3, s: 0.11, h: 3.6, name: 'carbon dioxide' },
  { l: 4.6, s: 0.1, h: 2.2, name: 'carbon monoxide' },
];

const SPECTRUM = {
  id: 'spectrum',
  title: 'The planet changes size with color',
  note: 'Depth against wavelength for a hot Jupiter like the one in the simulation. Every bump is a molecule making the atmosphere opaque, so the planet blocks a slightly wider disk at that color.',
  controls: [
    {
      id: 'lambda',
      label: 'Wavelength',
      unit: 'μm',
      min: 0.4,
      max: 5,
      step: 0.01,
      value: 1.4,
      decimals: 2,
    },
    {
      id: 'clouds',
      label: 'Cloud and haze cover',
      unit: '',
      min: 0,
      max: 1,
      step: 0.01,
      value: 0,
      decimals: 2,
    },
    {
      id: 'H',
      label: 'Scale height',
      unit: 'km',
      min: 100,
      max: 900,
      step: 10,
      value: 560,
      decimals: 0,
    },
  ],
  presets: [
    {
      label: 'Sodium, 0.589 μm',
      values: { lambda: 0.589, clouds: 0 },
      note: 'The first exoplanet atmosphere ever detected, in this very system: Charbonneau and colleagues found sodium in HD 209458 b with the Hubble Space Telescope in 2002, as a transit 0.02% deeper in the sodium line than beside it.',
    },
    {
      label: 'Water, 1.4 μm',
      values: { lambda: 1.4, clouds: 0 },
      note: 'The band Hubble’s infrared camera made routine, and the workhorse of atmospheric characterization before JWST.',
    },
    {
      label: 'Carbon dioxide, 4.3 μm',
      values: { lambda: 4.3, clouds: 0 },
      note: 'Out of reach from the ground and beyond Hubble’s reach as well. JWST returned the first unambiguous exoplanet carbon dioxide detection here in 2022.',
    },
    {
      label: 'A cloudy planet',
      values: { lambda: 1.4, clouds: 0.85 },
      note: 'High cloud decks sit above the molecular features and flatten the spectrum towards a straight line. Roughly half of all well-observed hot Jupiters look partly like this, which is a result in itself.',
    },
  ],
  compute(v) {
    // A hot Jupiter, matching the simulation's planet.
    const RpKm = 1.38 * R_JUP_KM;
    const RsKm = 1.155 * R_SUN_KM;
    const H = v.H;
    const clear = 1 - Math.min(1, Math.max(0, v.clouds));
    const at = lam => {
      // Rayleigh scattering lifts the continuum towards the blue.
      let heights = 1.5 + 2.2 * Math.pow(0.6 / Math.max(0.35, lam), 4) * 0.4;
      let strongest = null;
      for (const b of BANDS) {
        const x = (lam - b.l) / b.s;
        const contribution = b.h * Math.exp(-0.5 * x * x);
        heights += contribution;
        if (!strongest || contribution > strongest.c) {
          strongest = { c: contribution, name: b.name };
        }
      }
      const baseline = 1.5;
      const lifted = baseline + (heights - baseline) * clear;
      const Rp = RpKm + lifted * H;
      const k = Rp / RsKm;
      return { depth: k * k, Rp, heights: lifted, strongest };
    };
    const here = at(v.lambda);
    const floor = at(5.0);
    return { at, here, RpKm, RsKm, flat: (RpKm / RsKm) ** 2, floor };
  },
  readout(v) {
    const c = this.compute(v);
    const feature =
      c.here.strongest && c.here.strongest.c > 0.6
        ? c.here.strongest.name
        : 'no strong absorber here';
    return [
      { label: 'Wavelength', value: `${v.lambda.toFixed(2)} μm` },
      { label: 'Transit depth', value: ppm(c.here.depth), emphasis: true },
      {
        label: 'Depth above the bare-rock continuum',
        value: `${Math.round((c.here.depth - c.flat) * 1e6)} ppm`,
      },
      {
        label: 'Apparent planet radius',
        value: withUnit((c.here.Rp / R_JUP_KM).toFixed(4), 'R_J'),
      },
      { label: 'What is absorbing', value: feature },
    ];
  },
  draw(canvas, v) {
    const { ctx, w } = surface(canvas, 250);
    const c = this.compute(v);
    const ink = token('--text-primary', '#e9edf7');
    const muted = token('--text-muted', '#8a8f9e');
    const grid = token('--border-subtle', '#2a2f3d');
    const accent = token('--accent', '#38bdf8');

    const padL = 66;
    const padR = 12;
    const padT = 16;
    const padB = 46;
    const pw = w - padL - padR;
    const ph = 250 - padT - padB;

    const lo = 0.4;
    const hi = 5;
    const samples = [];
    // The sodium line is 0.012 μm wide, so a coarse grid turns it into an alias
    // spike and invents features that are not in the model.
    const N = 720;
    for (let i = 0; i <= N; i++) {
      const lam = lo + ((hi - lo) * i) / N;
      samples.push({ lam, d: c.at(lam).depth });
    }
    let dMin = Infinity;
    let dMax = -Infinity;
    for (const s of samples) {
      if (s.d < dMin) dMin = s.d;
      if (s.d > dMax) dMax = s.d;
    }
    const pad = Math.max((dMax - dMin) * 0.25, 4e-6);
    dMin -= pad;
    dMax += pad;
    const X = lam => padL + ((lam - lo) / (hi - lo)) * pw;
    const Y = d => padT + ph - ((d - dMin) / (dMax - dMin)) * ph;

    // Axes
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(padL + 0.5, padT + 0.5, pw - 1, ph - 1);
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = muted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const lam of [0.5, 1, 2, 3, 4, 5]) {
      const x = X(lam);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + ph);
      ctx.strokeStyle = grid;
      ctx.stroke();
      ctx.fillText(String(lam), x, padT + ph + 6);
    }
    ctx.fillText('wavelength (μm)', padL + pw / 2, padT + ph + 24);
    ctx.save();
    ctx.translate(12, padT + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'middle';
    ctx.fillText('transit depth (ppm)', 0, 0);
    ctx.restore();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 3; i++) {
      const d = dMin + ((dMax - dMin) * i) / 3;
      const y = Y(d);
      ctx.strokeStyle = grid;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + pw, y);
      ctx.stroke();
      ctx.fillStyle = muted;
      ctx.fillText(Math.round(d * 1e6).toLocaleString(), padL - 6, y);
    }

    // The flat, atmosphere-free level
    ctx.strokeStyle = muted;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, Y(c.flat));
    ctx.lineTo(padL + pw, Y(c.flat));
    ctx.stroke();
    ctx.setLineDash([]);

    // The spectrum
    ctx.beginPath();
    samples.forEach((s, i) => {
      const x = X(s.lam);
      const y = Y(s.d);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Where the slider is
    const x = X(v.lambda);
    ctx.strokeStyle = '#f2a65a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + ph);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, Y(c.here.depth), 4, 0, Math.PI * 2);
    ctx.fillStyle = '#f2a65a';
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.textAlign = x > padL + pw * 0.7 ? 'right' : 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      `${v.lambda.toFixed(2)} μm`,
      x + (x > padL + pw * 0.7 ? -6 : 6),
      Y(c.here.depth) - 8
    );
  },
};

// --- 4. Dilution by a companion star ------------------------------------------

const DILUTION = {
  id: 'dilution',
  title: 'A star you did not know was there',
  note: 'Extra light from a neighbor that the survey could not separate fills in the dip. The planet measures smaller than it is, by exactly the square root of the total flux ratio.',
  controls: [
    {
      id: 'dm',
      label: 'Companion contrast Δm',
      unit: 'mag',
      min: 0,
      max: 6,
      step: 0.1,
      value: 0.5,
      decimals: 1,
    },
    {
      id: 'rp',
      label: 'Radius you measured',
      unit: 'R⊕',
      min: 0.5,
      max: 15,
      step: 0.1,
      value: 1.5,
      decimals: 1,
    },
  ],
  presets: [
    {
      label: 'Equal twin, Δm = 0',
      values: { dm: 0 },
      note: 'Two identical stars. Half the light in the aperture is not the star being transited, so every radius derived from the blended curve is too small by a factor of √2.',
    },
    {
      label: 'The lesson’s binary, Δm = 0.5',
      values: { dm: 0.5 },
      note: 'The companion in the Blended Binary scenario. It supplies 39% of the light and shrinks the measured planet by 22%.',
    },
    {
      label: 'Robo-AO median, Δm = 3',
      values: { dm: 3 },
      note: 'A typical detection in the Robo-AO Kepler survey. Individually a 3% correction, which sounds harmless until you apply it to a population sitting right on the rocky-to-gaseous boundary.',
    },
    {
      label: 'Faint neighbor, Δm = 6',
      values: { dm: 6 },
      note: 'The faint end of what adaptive optics reaches. The correction is a fraction of a percent: below this, blending stops mattering and detection limits are what a survey has to quote.',
    },
  ],
  compute(v) {
    const f = Math.pow(10, -0.4 * v.dm);
    return {
      f,
      companionLight: f / (1 + f),
      correction: Math.sqrt(1 + f),
      truePlanet: v.rp * Math.sqrt(1 + f),
    };
  },
  readout(v) {
    const c = this.compute(v);
    return [
      {
        label: 'Flux ratio F<sub>2</sub> / F<sub>1</sub>',
        value: c.f.toFixed(4),
      },
      {
        label: 'Share of the light from the neighbor',
        value: `${(c.companionLight * 100).toFixed(1)}%`,
      },
      {
        label: 'Radius correction √(1 + F<sub>2</sub>/F<sub>1</sub>)',
        value: `×${c.correction.toFixed(3)}`,
        emphasis: true,
      },
      {
        label: 'True planet radius',
        value: withUnit(c.truePlanet.toFixed(2), 'R⊕'),
      },
      {
        label: 'Was it rocky?',
        value:
          v.rp < 1.6 && c.truePlanet >= 1.6
            ? 'it was, until you corrected it'
            : c.truePlanet < 1.6
              ? 'still below 1.6 R⊕'
              : 'no, above 1.6 R⊕ either way',
      },
    ];
  },
  draw(canvas, v) {
    const { ctx, w } = surface(canvas, 236);
    const c = this.compute(v);
    const muted = token('--text-muted', '#8a8f9e');
    const grid = token('--border-subtle', '#2a2f3d');
    const accent = token('--accent', '#38bdf8');
    const warn = '#f2a65a';

    // Left: what the aperture contains.
    const cx = 74;
    const cy = 96;
    drawStarDisk(ctx, cx - 16, cy, 30);
    const compScale = Math.max(0.22, Math.sqrt(c.f));
    drawStarDisk(ctx, cx + 30, cy - 12, 30 * compScale, '210, 226, 255');
    ctx.strokeStyle = muted;
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(cx + 4, cy - 4, 62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = muted;
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('one photometric aperture', cx + 4, cy + 66);
    ctx.fillText(`Δm = ${v.dm.toFixed(1)}`, cx + 4, cy + 80);

    // Right: the true curve and the blended one it turns into.
    const k = (v.rp * R_EARTH_IN_SUNS) / 1.0;
    const kBig = Math.max(k, 0.02);
    const x0 = 168;
    const cw = w - x0 - 10;
    const trueCurve = [];
    const seenCurve = [];
    for (let i = 0; i <= 160; i++) {
      const t = i / 160;
      const z = Math.abs((t - 0.5) * 2) * 1.6 * (1 + kBig);
      const drop = blockedFraction(z, kBig);
      trueCurve.push({ t, f: 1 - drop });
      seenCurve.push({ t, f: 1 - drop / (1 + c.f) });
    }
    const full = blockedFraction(0, kBig);
    const yMin = 1 - full * 1.3;
    const boxTop = 40;
    const boxH = 152;
    const seenColor = c.f > 0.02 ? warn : accent;

    // Legend above the box, not inside it: the blended curve's baseline runs
    // along the top edge and was drawing straight through the labels.
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = muted;
    ctx.fillText('- - true transit', x0, boxTop - 20);
    ctx.fillStyle = seenColor;
    ctx.fillText('what the survey records', x0, boxTop - 6);

    drawCurve(ctx, {
      x: x0,
      y: boxTop,
      w: cw,
      h: boxH,
      points: trueCurve,
      yMin,
      yMax: 1 + full * 0.15,
      color: muted,
      dashed: true,
      grid,
    });
    drawCurve(ctx, {
      x: x0,
      y: boxTop,
      w: cw,
      h: boxH,
      points: seenCurve,
      yMin,
      yMax: 1 + full * 0.15,
      color: seenColor,
    });
    ctx.fillStyle = muted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `measured ${v.rp.toFixed(1)} R⊕  →  actually ${c.truePlanet.toFixed(2)} R⊕`,
      x0 + cw / 2,
      boxTop + boxH + 10
    );
  },
};

// --- 5. Resolving the pair ----------------------------------------------------

// The field the picture covers, chosen to match SOAR's speckle camera, which
// images a 2.8 arcsecond box. One TESS pixel is 21 arcseconds across, so this
// whole frame is about two percent of the area of a single pixel.
const FIELD_ARCSEC = 2.8;

const RESOLVE = {
  id: 'resolve',
  title: 'Why nobody noticed',
  note: 'Two stars, imaged at a resolution you choose. The geometry and the brightness ratio are quantitative; the noise and the exact profile are illustrative, not a reconstruction of any real observation.',
  controls: [
    {
      id: 'fwhm',
      label: 'Image resolution',
      unit: '″ FWHM',
      min: 0.04,
      max: 1.6,
      step: 0.01,
      value: 1.1,
      decimals: 2,
    },
    {
      id: 'sep',
      label: 'Companion separation',
      unit: '″',
      min: 0.05,
      max: 2.4,
      step: 0.01,
      value: 0.65,
      decimals: 2,
    },
    {
      id: 'dm',
      label: 'Companion contrast Δm',
      unit: 'mag',
      min: 0,
      max: 6,
      step: 0.1,
      value: 1.5,
      decimals: 1,
    },
  ],
  presets: [
    {
      label: 'Ordinary seeing',
      values: { fwhm: 1.1 },
      note: 'What a ground telescope delivers without correction: the atmosphere smears every point source to about an arcsecond, and a companion inside that is simply part of the star.',
    },
    {
      label: 'Robo-AO, Palomar',
      values: { fwhm: 0.15 },
      note: 'Adaptive optics on the 1.5 m telescope at Palomar. A laser measures the atmospheric distortion, a deformable mirror takes it out in real time, and the whole loop runs robotically: which is what made imaging 3,857 Kepler hosts possible at all.',
    },
    {
      label: 'SOAR speckle, 4.1 m',
      values: { fwhm: 0.04 },
      note: 'Hundreds of very short exposures freeze the atmosphere, and combining them in Fourier space recovers the telescope’s diffraction limit. This is what the SOAR TESS survey uses, and it reaches separations twenty-five times finer than seeing.',
    },
    {
      label: 'A hard case',
      values: { fwhm: 0.15, sep: 0.18, dm: 4.5 },
      note: 'Close and faint at once. Separation alone does not decide a detection: every observation carries its own measured contrast curve, and a companion is only claimed if it sits above it.',
    },
  ],
  compute(v) {
    const f = Math.pow(10, -0.4 * v.dm);
    const ratio = v.sep / Math.max(0.01, v.fwhm);
    return {
      f,
      ratio,
      companionLight: f / (1 + f),
      correction: Math.sqrt(1 + f),
      // Purely descriptive: how the pair looks at this resolution, not a claim
      // about whether a survey would report it.
      look: ratio < 0.8 ? 'blended' : ratio < 1.4 ? 'elongated' : 'split',
      pixelFraction: (FIELD_ARCSEC / 21) ** 2,
    };
  },
  readout(v) {
    const c = this.compute(v);
    return [
      {
        label: 'Separation, in units of the resolution',
        value: `${c.ratio.toFixed(2)} × FWHM`,
      },
      {
        label: 'How the pair looks',
        value:
          c.look === 'blended'
            ? 'one source'
            : c.look === 'elongated'
              ? 'one elongated source'
              : 'two separate stars',
        emphasis: true,
      },
      {
        label: 'Light from the companion',
        value: `${(c.companionLight * 100).toFixed(1)}%`,
      },
      {
        label: 'Radius correction it implies',
        value: `×${c.correction.toFixed(3)}`,
      },
      {
        label: 'This frame, as a share of one TESS pixel',
        value: `${(c.pixelFraction * 100).toFixed(1)}% of its area`,
      },
    ];
  },
  draw(canvas, v) {
    const { ctx } = surface(canvas, 240);
    const c = this.compute(v);
    const muted = token('--text-muted', '#8a8f9e');
    const accent = token('--accent', '#38bdf8');

    // Render the pair into a small buffer and scale it up, which is both fast
    // and a fair picture of what a detector does.
    const N = 120;
    const buf = document.createElement('canvas');
    buf.width = N;
    buf.height = N;
    const bctx = buf.getContext('2d');
    const img = bctx.createImageData(N, N);
    const perPx = FIELD_ARCSEC / N;
    const sigma = Math.max(0.02, v.fwhm) / 2.3548;
    const half = N / 2;
    const dx = v.sep / 2 / perPx;
    const x1 = half - dx;
    const x2 = half + dx;
    const y1 = half + dx * 0.35;
    const y2 = half - dx * 0.35;
    // A detector never samples a point source more finely than its own pixels,
    // and neither does this picture: without the floor, a diffraction-limited
    // pair lands inside single cells of the buffer and all but disappears.
    const sigmaPx = Math.max(1.05, sigma / perPx);
    const s2 = 2 * sigmaPx * sigmaPx;

    let peak = 0;
    const field = new Float32Array(N * N);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const a = Math.exp(-(((i - x1) ** 2 + (j - y1) ** 2) / s2));
        const b = c.f * Math.exp(-(((i - x2) ** 2 + (j - y2) ** 2) / s2));
        const value = a + b;
        field[j * N + i] = value;
        if (value > peak) peak = value;
      }
    }
    for (let k = 0; k < N * N; k++) {
      // Square-root stretch, the standard way of showing a bright core and a
      // faint companion in the same frame.
      const t = Math.sqrt(Math.min(1, field[k] / (peak || 1)));
      const shade = Math.round(255 * t);
      img.data[k * 4] = Math.min(255, shade + 12);
      img.data[k * 4 + 1] = Math.min(255, shade + 6);
      img.data[k * 4 + 2] = shade;
      img.data[k * 4 + 3] = 255;
    }
    bctx.putImageData(img, 0, 0);

    const size = 168;
    const x0 = 14;
    const y0 = 14;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(buf, x0, y0, size, size);
    ctx.strokeStyle = muted;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, size - 1, size - 1);
    ctx.globalAlpha = 1;

    // Scale bar: half an arcsecond
    const barPx = (0.5 / FIELD_ARCSEC) * size;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0 + 10, y0 + size - 12);
    ctx.lineTo(x0 + 10 + barPx, y0 + size - 12);
    ctx.stroke();
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('0.5″', x0 + 10, y0 + size - 16);

    ctx.fillStyle = muted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${FIELD_ARCSEC}″ field`, x0 + size / 2, y0 + size + 8);

    // The verdict, beside the image
    const tx = x0 + size + 18;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '600 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = c.look === 'split' ? accent : '#f2a65a';
    const verdict =
      c.look === 'blended'
        ? 'Blended'
        : c.look === 'elongated'
          ? 'Elongated'
          : 'Resolved';
    ctx.fillText(verdict, tx, y0 + 6);
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = muted;
    const lines =
      c.look === 'blended'
        ? [
            'The companion is buried',
            'inside the primary’s',
            'own point spread',
            'function.',
          ]
        : c.look === 'elongated'
          ? [
              'The pair shows as one',
              'asymmetric source.',
              'Enough to suspect,',
              'not to measure.',
            ]
          : [
              'Two sources, separately',
              'measurable. The contrast',
              'gives the dilution',
              'correction.',
            ];
    lines.forEach((line, i) => ctx.fillText(line, tx, y0 + 30 + i * 15));
    ctx.fillText(`${v.fwhm.toFixed(2)}″ resolution`, tx, y0 + 108);
    ctx.fillText(`${v.sep.toFixed(2)}″ apart`, tx, y0 + 123);
    ctx.fillText(`Δm = ${v.dm.toFixed(1)}`, tx, y0 + 138);
  },
};

/** The instruments the transit lesson hands out. Registered in widgets.js. */
export const TRANSIT_WIDGETS = [
  DEPTH_SIZE,
  GEOMETRY,
  SPECTRUM,
  DILUTION,
  RESOLVE,
];
